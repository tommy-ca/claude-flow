# Steering Workflow Orchestrator

## Overview

The SteeringOrchestrator is a specialized workflow coordination component extracted from the original steering-workflow-engine.ts, following SOLID principles and the Single Responsibility Principle. It provides high-level orchestration of steering document operations while delegating specific tasks to focused components.

## Architecture

The orchestrator follows the **Dependency Injection** pattern and implements the **ISteeringWorkflowCoordination** interface:

```typescript
SteeringOrchestrator
├── ISteeringDocumentManager    // Document CRUD operations
├── ISteeringValidator          // Validation logic
├── ISteeringContentGenerator   // Content generation
├── MaestroCoordinator         // Task coordination
└── MaestroLogger              // Logging
```

## Key Features

### 🎯 **Focused Orchestration (~200 lines)**
- Main workflow execution coordination
- Component integration and dependency management  
- Event emission and handling
- Progress tracking and monitoring
- Error handling and recovery

### 🔄 **Event-Driven Communication**
```typescript
orchestrator.on('steeringWorkflowEvent', (event) => {
  switch (event.type) {
    case 'workflow_started':
    case 'workflow_completed':
    case 'document_created':
    case 'document_updated':
    case 'cross_validation_completed':
    // Handle events...
  }
});
```

### 🛡️ **Robust Error Recovery**
- Multiple recovery strategies (validation-retry, document-recovery, graceful-degradation)
- Automatic workflow progress restoration
- Detailed error reporting and logging

### 📊 **Progress Tracking**
```typescript
const progress = await orchestrator.manageWorkflowProgress(workflowId);
// Returns: { workflowId, totalSteps, completedSteps, currentStep, status, progress%, lastUpdated }
```

## Usage Examples

### Basic Workflow Execution

```typescript
import { createSteeringOrchestrator } from './components/index.js';

// Create orchestrator with dependencies
const orchestrator = createSteeringOrchestrator(
  documentManager,
  validator,
  contentGenerator,
  coordinator,
  logger
);

// Execute workflow
const result = await orchestrator.executeSteeringWorkflow({
  operation: SteeringOperation.CREATE,
  documentType: SteeringDocumentType.PRODUCT,
  content: 'Initial product vision content',
  globalContext: { project: 'claude-flow' },
  requireConsensus: true,
  priority: 'high'
});
```

### Document Operations

```typescript
// Create document
const createResult = await orchestrator.orchestrateDocumentOperation(
  SteeringOperation.CREATE,
  {
    documentType: SteeringDocumentType.STRUCTURE,
    content: 'Architecture content',
    globalContext: { methodology: 'SPARC' }
  }
);

// Update document
const updateResult = await orchestrator.orchestrateDocumentOperation(
  SteeringOperation.UPDATE,
  {
    documentType: SteeringDocumentType.TECH,
    content: 'Updated tech standards',
    globalContext: { version: '2.0' }
  }
);
```

### Cross-Document Validation

```typescript
// Validate all documents
const documents = await documentManager.getAllDocuments();
const validationResult = await orchestrator.coordinateValidationProcess(documents);

// Cross-validate for alignment
const crossValidationResult = await orchestrator.executeSteeringWorkflow({
  operation: SteeringOperation.CROSS_VALIDATE,
  requireConsensus: true
});
```

### Error Handling

```typescript
try {
  const result = await orchestrator.executeSteeringWorkflow(request);
} catch (error) {
  // Automatic recovery is attempted
  const recovery = await orchestrator.handleWorkflowFailure(workflowId, error);
  
  if (recovery.success) {
    console.log('Recovery successful:', recovery.actions);
  } else {
    console.error('Recovery failed, manual intervention required');
  }
}
```

## Supported Operations

| Operation | Description | Result |
|-----------|-------------|---------|
| `CREATE` | Create new steering document | Document + validation |
| `UPDATE` | Update existing document | Enhanced document + validation |
| `VALIDATE` | Validate document(s) | Validation result |
| `SYNC` | Synchronize all documents | Cross-validation result |
| `CROSS_VALIDATE` | Cross-validate alignment | Alignment scores + recommendations |
| `GENERATE_SPEC` | Generate specifications from steering docs | Requirements extraction |

## Integration with SPARC Methodology

The orchestrator supports specs-driven development and SPARC methodology phases:

```typescript
// SPARC Phase Integration
const sparcResult = await orchestrator.executeSteeringWorkflow({
  operation: SteeringOperation.GENERATE_SPEC,
  metadata: {
    specName: 'user-authentication-spec',
    description: 'User authentication system specification',
    stakeholders: ['development-team', 'security-team']
  }
});
```

## Event Types

```typescript
type SteeringWorkflowEvent = 
  | { type: 'workflow_started'; data: { workflowId: string; operation: SteeringOperation } }
  | { type: 'workflow_completed'; data: SteeringOperationResult }
  | { type: 'workflow_failed'; data: { workflowId: string; error: Error; request: SteeringWorkflowRequest } }
  | { type: 'document_created'; data: SteeringDocument }
  | { type: 'document_updated'; data: SteeringDocument }
  | { type: 'document_validated'; data: { document: SteeringDocument; validation: ValidationResult } }
  | { type: 'cross_validation_completed'; data: CrossDocumentValidation }
  | { type: 'progress_updated'; data: WorkflowProgress }
  | { type: 'recovery_attempted'; data: RecoveryResult };
```

## Dependency Validation

```typescript
import { validateOrchestratorDependencies } from './components/index.js';

const validation = validateOrchestratorDependencies(
  documentManager,
  validator,
  contentGenerator,
  coordinator,
  logger
);

if (!validation.valid) {
  console.error('Dependency validation failed:', validation.errors);
}
```

## Best Practices

### 1. **Dependency Injection**
Always use the factory function for proper dependency injection:
```typescript
const orchestrator = createSteeringOrchestrator(deps...);
```

### 2. **Event Handling**
Set up event listeners before executing workflows:
```typescript
orchestrator.on('steeringWorkflowEvent', handleWorkflowEvent);
await orchestrator.executeSteeringWorkflow(request);
```

### 3. **Error Recovery**
Leverage automatic recovery mechanisms:
```typescript
// Automatic recovery is built-in
const result = await orchestrator.executeSteeringWorkflow(request);
// Check result.warnings for recovery attempts
```

### 4. **Progress Monitoring**
Track long-running workflows:
```typescript
const workflowId = result.workflowId;
setInterval(async () => {
  const progress = await orchestrator.manageWorkflowProgress(workflowId);
  console.log(`Progress: ${progress.progress}%`);
}, 5000);
```

## Integration Points

### With SpecsDrivenFlowOrchestrator
```typescript
// Automatic integration for spec generation
const specResult = await orchestrator.executeSteeringWorkflow({
  operation: SteeringOperation.GENERATE_SPEC,
  metadata: { specName: 'api-specification' }
});
```

### With MaestroCoordinator
```typescript
// Tasks are automatically created and managed
// Progress is tracked via MaestroTask instances
```

### With HiveMind Swarm
```typescript
// Swarm agents are coordinated through MaestroCoordinator
// Consensus mechanisms are handled automatically
```

## Performance Characteristics

- **Focused Logic**: ~200 lines of orchestration code
- **Event-Driven**: Non-blocking event emission
- **Recovery**: Automatic failure recovery strategies
- **Progress Tracking**: Real-time workflow monitoring
- **Memory Efficient**: Workflow cleanup after completion

## Testing

```typescript
// Mock dependencies for unit testing
const mockDocumentManager = { /* implement interface */ };
const mockValidator = { /* implement interface */ };
const mockContentGenerator = { /* implement interface */ };
const mockCoordinator = { /* implement interface */ };
const mockLogger = { /* implement interface */ };

const orchestrator = createSteeringOrchestrator(
  mockDocumentManager,
  mockValidator,
  mockContentGenerator,
  mockCoordinator,
  mockLogger
);

// Test workflow execution
const result = await orchestrator.executeSteeringWorkflow(testRequest);
expect(result.success).toBe(true);
```

## Migration from steering-workflow-engine.ts

The orchestrator extracts the following responsibilities from the original engine:

- **Lines 140-207**: Main workflow execution logic → `executeSteeringWorkflow()`
- **Lines 303-335**: Task coordination → `orchestrateDocumentOperation()`
- **Event emission**: → `emitWorkflowEvent()`
- **Progress tracking**: → `manageWorkflowProgress()`
- **Error handling**: → `handleWorkflowFailure()`

The remaining responsibilities (document management, validation, content generation) are delegated to separate components following the Single Responsibility Principle.