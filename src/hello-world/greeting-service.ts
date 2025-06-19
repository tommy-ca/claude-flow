import { IGreetingService } from './interfaces';

export class GreetingService implements IGreetingService {
  private readonly greeting: string = 'Hello, World!';

  getMessage(): string {
    return this.greeting;
  }

  displayGreeting(): void {
    try {
      const message = this.getMessage();
      console.log(message);
    } catch (error) {
      console.error('Failed to display greeting:', error);
    }
  }
}