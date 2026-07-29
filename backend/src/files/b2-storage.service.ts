import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client,PutObjectCommand,ListObjectsV2Command,GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';import { AppConfig } from '../config/configuration';import { StorageAdapter } from './storage-adapter.interface';
@Injectable() export class B2StorageService implements StorageAdapter {
 private readonly logger=new Logger(B2StorageService.name);private readonly s3:S3Client;private readonly bucketName:string;
 constructor(config:ConfigService<AppConfig,true>){const b2=config.get('b2',{infer:true});this.bucketName=b2.bucketName;this.s3=new S3Client({endpoint:`https://${b2.endpoint}`,region:'auto',credentials:{accessKeyId:b2.keyId,secretAccessKey:b2.applicationKey}});}
 async uploadFile(file:Express.Multer.File):Promise<{key:string;url:null}>{const key=`uploads/${randomUUID()}-${file.originalname}`;await this.putPrivateObject(key,file.buffer,file.mimetype||'application/octet-stream');return{key,url:null};}
 async listObjectsByPrefix(prefix:string):Promise<string[]>{const keys:string[]=[];let continuationToken:string|undefined;do{const res=await this.s3.send(new ListObjectsV2Command({Bucket:this.bucketName,Prefix:prefix,ContinuationToken:continuationToken}));for(const obj of res.Contents??[])if(obj.Key)keys.push(obj.Key);continuationToken=res.NextContinuationToken;}while(continuationToken);return keys;}
 async getPrivateObject(key:string):Promise<Buffer>{const res=await this.s3.send(new GetObjectCommand({Bucket:this.bucketName,Key:key}));const body=res.Body;if(!body||!('transformToByteArray' in body))throw new Error('Không đọc được private object');return Buffer.from(await body.transformToByteArray());}
 async getObjectBuffer(key:string){return this.getPrivateObject(key);}
 async putPrivateObject(key:string,buffer:Buffer,contentType:string):Promise<string>{try{await this.s3.send(new PutObjectCommand({Bucket:this.bucketName,Key:key,Body:buffer,ContentType:contentType}));return key;}catch{this.logger.error('Private B2 operation failed');throw new Error('Lưu private object thất bại');}}
 async uploadBuffer(key:string,buffer:Buffer,contentType:string){return this.putPrivateObject(key,buffer,contentType);}
}