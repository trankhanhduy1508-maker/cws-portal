import { Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OutputsService } from './outputs.service';
@Controller('outputs')
export class OutputsController {
  constructor(private readonly outputs:OutputsService){}
  @Post(':orderId/access') @UseGuards(JwtAuthGuard)
  grant(@Param('orderId') orderId:string,@Req() req:AuthenticatedRequest){return this.outputs.createAccessGrant(orderId,req.user);}
  @Get(':orderId/download') @Header('Cache-Control','private, no-store')
  async download(@Param('orderId') orderId:string,@Query('token') token:string,@Res() res:Response){
    const file=await this.outputs.redeem(orderId,token);
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition',`attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  }
}
