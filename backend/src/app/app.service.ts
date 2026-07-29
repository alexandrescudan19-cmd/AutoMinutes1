import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    // Returneaza raspunsul de baza. acum.
    return 'Hello World!';
  }
}
