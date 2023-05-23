import { Controller, DefaultValuePipe, Get, Inject, Param, ParseArrayPipe, ParseBoolPipe, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { pocService, searchPms } from '../pocService';

type ProjetDomainise = {
    id: number;
    objet_marche: string;
    pms: string[];
   };

@Controller('poc')
export class PocController {
    @Inject(pocService)
    private readonly service: pocService;

    @Get('createBilanTestDomainisation/:nom')
    createBilanTestDomainisation(@Param() params: { nom: string }) {
        return this.service.createBilanTestDomainisation(params.nom);
    }

    @Get('initEsIndex/:indexName')
    initEsIndex(@Param() params: { indexName: string }): any {
        return this.service.initEsIndex(params.indexName);
    }

    @Get('search/:keywords')
    search(@Param() params: { keywords: string }): any {
        return this.service.search(params.keywords);
    }

    @Get('searchdomaine/:keywords')
    searchPms(@Param() params: { keywords: string }, @Query('minHitsScore', new DefaultValuePipe(15), ParseIntPipe) minHitsScore: number
    , @Query('maxHits', new DefaultValuePipe(1), ParseIntPipe) maxHits: number): any {
        return searchPms(params.keywords, minHitsScore).then(p => {
            return p.flat(1).slice(0,maxHits);
        });
    }

    @Get('domainisation')
    domainisation(@Param() params: { keywords: string }, @Query('minHitsScore', new DefaultValuePipe(15), ParseIntPipe) minHitsScore: number
    , @Query('maxHits', new DefaultValuePipe(1), ParseIntPipe) maxHits: number): any {
        return searchPms(params.keywords, minHitsScore).then(p => {
            return p.flat(1).slice(0,maxHits);
        });
    }
}
