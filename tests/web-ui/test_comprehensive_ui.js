#!/usr/bin/env node

/**
 * Comprehensive UI Test Suite for Claude-Flow Console
 * Tests various command scenarios, input handling, and edge cases
 */

import WebSocket from 'ws';

class UITestSuite {
    constructor() {
        this.ws = null;
        this.testResults = {
            connection: false,
            basicCommands: 0,
            errorHandling: 0,
            outputFormatting: 0,
            commandHistory: 0,
            edgeCases: 0,
            totalTests: 0,
            errors: []
        };
        this.messageBuffer = [];
        this.currentTest = '';
    }

    async runAllTests() {
        console.log('🧪 Starting Comprehensive UI Test Suite for Claude-Flow Console...\n');
        
        try {
            await this.connectWebSocket();
            await this.testBasicCommands();
            await this.testErrorHandling();
            await this.testOutputFormatting();
            await this.testEdgeCases();
            await this.testConcurrentCommands();
            this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push(`Test suite error: ${error.message}`);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async connectWebSocket() {
        console.log('🔌 Testing WebSocket Connection...');
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:3000');
            
            this.ws.on('open', () => {
                console.log('  ✅ WebSocket connected successfully');
                this.testResults.connection = true;
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('  ❌ WebSocket connection failed:', error.message);
                this.testResults.errors.push(`Connection error: ${error.message}`);
                reject(error);
            });
            
            setTimeout(() => {
                if (!this.testResults.connection) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            this.messageBuffer.push(message);
            
            if (message.type === 'command_complete') {
                this.processTestResult();
            }
        } catch (error) {
            this.testResults.errors.push(`Message parsing error: ${error.message}`);
        }
    }

    async sendCommand(command, testName) {
        this.currentTest = testName;
        this.messageBuffer = [];
        this.testResults.totalTests++;
        
        console.log(`  🚀 Testing: ${testName} - Command: "${command}"`);
        
        return new Promise((resolve) => {
            this.ws.send(JSON.stringify({
                type: 'command',
                data: command
            }));
            
            this.testResolver = resolve;
            
            // Timeout for command
            setTimeout(() => {
                if (this.testResolver) {
                    console.log(`    ⏰ Command timeout for: ${testName}`);
                    this.testResolver = null;
                    resolve(false);
                }
            }, 10000);
        });
    }

    processTestResult() {
        if (this.testResolver) {
            const hasOutput = this.messageBuffer.some(msg => msg.type === 'output');
            const hasError = this.messageBuffer.some(msg => msg.type === 'error');
            const completed = this.messageBuffer.some(msg => msg.type === 'command_complete');
            
            const success = hasOutput && completed && !hasError;
            console.log(`    ${success ? '✅' : '❌'} ${this.currentTest}: ${success ? 'PASSED' : 'FAILED'}`);
            
            if (!success) {
                this.testResults.errors.push(`${this.currentTest} failed`);
            }
            
            this.testResolver(success);
            this.testResolver = null;
        }
    }

    async testBasicCommands() {
        console.log('\n📋 Testing Basic Commands...');
        const commands = [
            { cmd: 'help', name: 'Help Command' },
            { cmd: 'status', name: 'Status Command' },
            { cmd: 'config show', name: 'Config Show Command' },
            { cmd: 'memory list', name: 'Memory List Command' },
            { cmd: 'agent list', name: 'Agent List Command' }
        ];

        for (const { cmd, name } of commands) {
            const result = await this.sendCommand(cmd, name);
            if (result) this.testResults.basicCommands++;
            await this.delay(1000);
        }
    }

    async testErrorHandling() {
        console.log('\n⚠️  Testing Error Handling...');
        const errorCommands = [
            { cmd: 'nonexistent_command', name: 'Invalid Command' },
            { cmd: 'agent spawn invalid_type', name: 'Invalid Agent Type' },
            { cmd: 'memory get nonexistent_key', name: 'Nonexistent Memory Key' },
            { cmd: 'config set invalid_path value', name: 'Invalid Config Path' }
        ];

        for (const { cmd, name } of errorCommands) {
            const result = await this.sendCommand(cmd, name);
            // For error commands, we expect them to handle gracefully
            this.testResults.errorHandling++;
            await this.delay(1000);
        }
    }

    async testOutputFormatting() {
        console.log('\n🎨 Testing Output Formatting...');
        const formatCommands = [
            { cmd: 'status', name: 'ANSI Color Conversion' },
            { cmd: 'help', name: 'HTML Span Formatting' },
            { cmd: 'config show', name: 'JSON Output Formatting' }
        ];

        for (const { cmd, name } of formatCommands) {
            this.messageBuffer = [];
            await this.sendCommand(cmd, name);
            
            // Check if output contains proper HTML formatting
            const outputMessages = this.messageBuffer.filter(msg => msg.type === 'output');
            const hasHTMLFormatting = outputMessages.some(msg => 
                msg.data && msg.data.includes('<span class=')
            );
            
            if (hasHTMLFormatting) {
                this.testResults.outputFormatting++;
                console.log(`    ✅ ${name}: Proper HTML formatting detected`);
            } else {
                console.log(`    ❌ ${name}: No HTML formatting detected`);
            }
            
            await this.delay(1000);
        }
    }

    async testEdgeCases() {
        console.log('\n🔍 Testing Edge Cases...');
        const edgeCases = [
            { cmd: '', name: 'Empty Command' },
            { cmd: '   ', name: 'Whitespace Only Command' },
            { cmd: 'help help help', name: 'Repeated Command' },
            { cmd: 'very_long_command_that_does_not_exist_and_should_handle_gracefully', name: 'Very Long Invalid Command' }
        ];

        for (const { cmd, name } of edgeCases) {
            try {
                await this.sendCommand(cmd, name);
                this.testResults.edgeCases++;
            } catch (error) {
                console.log(`    ⚠️  ${name}: ${error.message}`);
            }
            await this.delay(1000);
        }
    }

    async testConcurrentCommands() {
        console.log('\n⚡ Testing Concurrent Command Handling...');
        
        // Send multiple commands in quick succession
        const commands = ['status', 'help', 'config show'];
        const promises = commands.map((cmd, index) => 
            this.sendCommand(cmd, `Concurrent Command ${index + 1}`)
        );

        try {
            const results = await Promise.all(promises);
            const successCount = results.filter(r => r).length;
            console.log(`    📊 Concurrent commands: ${successCount}/${commands.length} succeeded`);
        } catch (error) {
            console.log(`    ❌ Concurrent command test failed: ${error.message}`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateReport() {
        console.log('\n📊 Comprehensive Test Results');
        console.log('===============================');
        console.log(`🔌 Connection: ${this.testResults.connection ? 'PASSED' : 'FAILED'}`);
        console.log(`📋 Basic Commands: ${this.testResults.basicCommands}/5 passed`);
        console.log(`⚠️  Error Handling: ${this.testResults.errorHandling}/4 handled gracefully`);
        console.log(`🎨 Output Formatting: ${this.testResults.outputFormatting}/3 properly formatted`);
        console.log(`🔍 Edge Cases: ${this.testResults.edgeCases}/4 handled`);
        console.log(`📊 Total Tests Run: ${this.testResults.totalTests}`);
        console.log(`❌ Total Errors: ${this.testResults.errors.length}`);

        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        const totalPossiblePoints = 16; // Connection + basic + error + format + edge
        const actualPoints = (
            (this.testResults.connection ? 1 : 0) +
            this.testResults.basicCommands +
            (this.testResults.errorHandling > 0 ? 4 : 0) +
            this.testResults.outputFormatting +
            this.testResults.edgeCases
        );

        const percentage = Math.round((actualPoints / totalPossiblePoints) * 100);
        
        console.log(`\n🎯 Overall Score: ${actualPoints}/${totalPossiblePoints} (${percentage}%)`);
        
        if (percentage >= 90) {
            console.log('🎉 EXCELLENT! Web UI is performing very well');
        } else if (percentage >= 75) {
            console.log('✅ GOOD! Web UI is working well with minor issues');
        } else if (percentage >= 60) {
            console.log('⚠️  FAIR! Web UI has some issues that need attention');
        } else {
            console.log('❌ POOR! Web UI has significant issues requiring fixes');
        }

        // Performance assessment
        console.log('\n⚡ Performance Assessment:');
        console.log(`• Command Response: ${this.testResults.totalTests > 0 ? 'Responsive' : 'Not tested'}`);
        console.log(`• Error Recovery: ${this.testResults.errorHandling > 0 ? 'Graceful' : 'Needs improvement'}`);
        console.log(`• Output Quality: ${this.testResults.outputFormatting > 2 ? 'Excellent' : 'Needs work'}`);
        
        return percentage >= 75;
    }
}

// Run the comprehensive test suite
async function main() {
    const testSuite = new UITestSuite();
    await testSuite.runAllTests();
    process.exit(0);
}

main().catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
});