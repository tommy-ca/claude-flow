#!/usr/bin/env node

/**
 * WebSocket Test Script for Claude-Flow Console
 * Tests the real-time command execution functionality
 */

import WebSocket from 'ws';

async function testWebSocket() {
    console.log('🧪 Testing Claude-Flow WebSocket Console Interface...\n');
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3000');
        let testResults = {
            connection: false,
            statusReceived: false,
            commandExecution: false,
            outputReceived: false,
            errors: []
        };
        
        let messageCount = 0;
        let testTimeout;
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            testResults.connection = true;
            
            // Test timeout
            testTimeout = setTimeout(() => {
                console.log('⏰ Test timeout reached');
                ws.close();
                resolve(testResults);
            }, 10000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                messageCount++;
                
                console.log(`📨 Message ${messageCount}:`, message.type);
                
                switch (message.type) {
                    case 'status':
                        console.log('   Status data received:', JSON.stringify(message.data));
                        testResults.statusReceived = true;
                        
                        // Send a test command after receiving status
                        setTimeout(() => {
                            console.log('🚀 Sending test command: "status"');
                            ws.send(JSON.stringify({
                                type: 'command',
                                data: 'status'
                            }));
                        }, 1000);
                        break;
                        
                    case 'output':
                        console.log('   Output received:', message.data.substring(0, 100) + '...');
                        testResults.outputReceived = true;
                        testResults.commandExecution = true;
                        break;
                        
                    case 'command_complete':
                        console.log('   Command completed');
                        
                        // Send another command to test multiple commands
                        setTimeout(() => {
                            console.log('🚀 Sending test command: "help"');
                            ws.send(JSON.stringify({
                                type: 'command',
                                data: 'help'
                            }));
                            
                            // Close after help command
                            setTimeout(() => {
                                ws.close();
                            }, 2000);
                        }, 500);
                        break;
                        
                    case 'error':
                        console.log('❌ Error received:', message.data);
                        testResults.errors.push(message.data);
                        break;
                        
                    default:
                        console.log('   Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('❌ Failed to parse message:', error.message);
                testResults.errors.push(`Parse error: ${error.message}`);
            }
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            clearTimeout(testTimeout);
            resolve(testResults);
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            testResults.errors.push(`WebSocket error: ${error.message}`);
            clearTimeout(testTimeout);
            reject(error);
        });
    });
}

async function runTests() {
    try {
        console.log('🔍 Testing WebSocket functionality...\n');
        
        const results = await testWebSocket();
        
        console.log('\n📊 Test Results:');
        console.log('================');
        console.log('✅ Connection Established:', results.connection);
        console.log('✅ Status Message Received:', results.statusReceived);
        console.log('✅ Command Execution:', results.commandExecution);
        console.log('✅ Output Received:', results.outputReceived);
        console.log('❌ Errors:', results.errors.length);
        
        if (results.errors.length > 0) {
            console.log('\nErrors encountered:');
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        const successCount = Object.values(results).filter(v => v === true).length;
        const totalTests = 4; // connection, status, command execution, output
        
        console.log(`\n🎯 Overall Score: ${successCount}/${totalTests} tests passed`);
        
        if (successCount === totalTests && results.errors.length === 0) {
            console.log('🎉 All WebSocket tests PASSED!');
            process.exit(0);
        } else {
            console.log('⚠️  Some tests failed or had errors');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests();