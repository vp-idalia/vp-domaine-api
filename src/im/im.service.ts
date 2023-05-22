// import { Injectable, Inject } from '@nestjs/common';
// import { Repository } from 'typeorm';
// import { Im } from './im.entity';

// @Injectable()
// export class ImService {
//   constructor(
//     @Inject('IM_REPOSITORY')
//     private imRepository: Repository<Im>,
//   ) {}

//   async findAll(): Promise<Im[]> {
//     return this.imRepository.find();
//   }
// }