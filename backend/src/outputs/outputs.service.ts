import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AppConfig } from '../config/configuration';
import { STORAGE_ADAPTER, StorageAdapter } from '../files/storage-adapter.interface';
import { OutputsRepository } from './outputs.repository';
import { OutputAccessGrant } from './output.types';
interface TokenPayload { orderId:string; actorId:string; isAdmin:boolean; exp:number; nonce:string; }
@Injectable()
export class OutputsService {
  private readonly ttlSeconds=300;
  constructor(private readonly repo:OutputsRepository,@Inject(STORAGE_ADAPTER) private readonly storage:StorageAdapter,private readonly config:ConfigService<AppConfig,true>){}
  async registerReadyOutput(orderId:string,objectKey:string,sizeBytes:number){
    if(objectKey!==`results/${orderId}.zip`) throw new Error('Invalid output object key');
    await this.repo.register(orderId,objectKey,sizeBytes);
    return this.repo.unlock(orderId,'payment-output-unlock');
  }
  async createAccessGrant(orderId:string,actor:{userId:string;role:string}):Promise<OutputAccessGrant>{
    const exp=Math.floor(Date.now()/1000)+this.ttlSeconds; const nonce=randomUUID();
    await this.repo.authorize({orderId,actorId:actor.userId,isAdmin:actor.role==='admin',action:'ACCESS_GRANTED',idempotencyKey:nonce,expiresAt:new Date(exp*1000).toISOString()});
    const payload:TokenPayload={orderId,actorId:actor.userId,isAdmin:actor.role==='admin',exp,nonce};
    const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig=this.sign(encoded);
    return {url:`/outputs/${orderId}/download?token=${encoded}.${sig}`,expiresAt:exp*1000};
  }
  async redeem(orderId:string,token:string):Promise<{buffer:Buffer;fileName:string}>{
    const payload=this.verify(token);
    if(payload.orderId!==orderId||payload.exp<Math.floor(Date.now()/1000)) throw new UnauthorizedException('Download link invalid or expired');
    const output=await this.repo.authorize({orderId,actorId:payload.actorId,isAdmin:payload.isAdmin,action:'DOWNLOAD_REDEEMED',idempotencyKey:payload.nonce,expiresAt:new Date(payload.exp*1000).toISOString()});
    if(output.objectKey!==`results/${orderId}.zip`) throw new NotFoundException('Output unavailable');
    return {buffer:await this.storage.getPrivateObject(output.objectKey),fileName:`cws-${orderId}.zip`};
  }
  private sign(value:string){return createHmac('sha256',this.config.get('jwtSecret',{infer:true})).update(value).digest('base64url');}
  private verify(token:string):TokenPayload{
    const [encoded,sig]=token.split('.'); if(!encoded||!sig) throw new UnauthorizedException('Invalid download token');
    const expected=this.sign(encoded); const a=Buffer.from(sig); const b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b)) throw new UnauthorizedException('Invalid download token');
    try{return JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')) as TokenPayload;}catch{throw new UnauthorizedException('Invalid download token');}
  }
}
