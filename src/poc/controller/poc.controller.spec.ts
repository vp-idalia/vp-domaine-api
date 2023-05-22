import { Test, TestingModule } from '@nestjs/testing';
import { PocController } from './poc.controller';

describe('PocController', () => {
  let poccontroller: PocController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PocController],
    }).compile();

    poccontroller = module.get<PocController>(PocController);
  });

  it('should be defined', () => {
    expect(poccontroller).toBeDefined();
  });
});
