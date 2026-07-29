import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OutputRecord } from './output.types';
interface OutputRow { id:string; order_id:string; object_key:string; size_bytes:number; status:'locked'|'unlocked'|'revoked'; }
const map=(r:OutputRow):OutputRecord=>({id:r.id,orderId:r.order_id,objectKey:r.object_key,sizeBytes:r.size_bytes,status:r.status});
@Injectable()
export class OutputsRepository {
  constructor(private readonly db: SupabaseService) {}
  private async rpc(name:string,args:Record<string,unknown>):Promise<OutputRecord>{
    const {data,error}=await this.db.getClient().rpc(name,args);
    if(error) throw new Error('Output access denied');
    const row=Array.isArray(data)?data[0]:data;
    if(!row) throw new Error('Output unavailable');
    return map(row as OutputRow);
  }
  register(orderId:string,objectKey:string,sizeBytes:number){return this.rpc('register_output_p2',{p_order_id:orderId,p_object_key:objectKey,p_size_bytes:sizeBytes});}
  unlock(orderId:string,actorId:string){return this.rpc('unlock_output_p2',{p_order_id:orderId,p_actor_id:actorId});}
  authorize(input:{orderId:string;actorId:string;isAdmin:boolean;action:'ACCESS_GRANTED'|'DOWNLOAD_REDEEMED';idempotencyKey:string;expiresAt:string;}){
    return this.rpc('authorize_output_access_p2',{p_order_id:input.orderId,p_actor_id:input.actorId,p_is_admin:input.isAdmin,p_action:input.action,p_idempotency_key:input.idempotencyKey,p_expires_at:input.expiresAt});
  }
}
