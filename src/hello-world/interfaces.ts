export interface IGreetingProvider {
  getMessage(): string;
}

export interface IOutputHandler {
  output(message: string): void;
}

export interface IGreetingService {
  getMessage(): string;
  displayGreeting(): void;
}