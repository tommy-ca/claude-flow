import { GreetingService } from './greeting-service';

export function main(): void {
  const greetingService = new GreetingService();
  greetingService.displayGreeting();
}

export { GreetingService } from './greeting-service';
export * from './interfaces';