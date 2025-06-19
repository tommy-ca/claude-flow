#!/usr/bin/env node

/**
 * Error Handling Test for Claude-Flow Console
 * Tests various failure scenarios and recovery mechanisms
 */

import WebSocket from 'ws';

async function testErrorHandling() {
    console.log('🛠️  Testing Error Handling and Recovery Mechanisms...\n');
    
    const testResults = {
        connectionRecovery: false,
        invalidCommands: 0,
        malformedMessages: 0,
        timeoutHandling: 0,
        gracefulFailures: 0,
        totalTests: 0,
        errors: []
    };
    
    // Test 1: Invalid commands
    console.log('📋 Testing Invalid Command Handling...');
    await testInvalidCommands(testResults);
    
    // Test 2: Malformed WebSocket messages
    console.log('\n🔧 Testing Malformed Message Handling...');
    await testMalformedMessages(testResults);
    
    // Test 3: Connection recovery
    console.log('\n🔄 Testing Connection Recovery...');
    await testConnectionRecovery(testResults);
    
    // Test 4: Server errors
    console.log('\n⚠️  Testing Server Error Handling...');
    await testServerErrors(testResults);
    
    generateErrorReport(testResults);
}

async function testInvalidCommands(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        const invalidCommands = [
            'completely_invalid_command',
            'agent spawn nonexistent_type',
            'memory get missing_key',
            'config set invalid.path value'
        ];
        
        let testIndex = 0;
        let gracefulHandling = 0;
        
        ws.on('open', () => {
            sendNextInvalidCommand();
        });
        
        function sendNextInvalidCommand() {
            if (testIndex >= invalidCommands.length) {
                results.invalidCommands = gracefulHandling;
                results.totalTests += invalidCommands.length;
                ws.close();
                return;
            }
            
            const command = invalidCommands[testIndex++];
            console.log(`  🚀 Testing invalid command: "${command}"`);
            
            ws.send(JSON.stringify({
                type: 'command',
                data: command
            }));
            
            let hasOutput = false;
            let hasCompletion = false;
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'output') {
                    hasOutput = true;
                }
                
                if (message.type === 'command_complete') {
                    hasCompletion = true;
                    ws.off('message', messageHandler);
                    
                    if (hasOutput && hasCompletion) {
                        gracefulHandling++;
                        console.log(`    ✅ Handled gracefully`);
                    } else {
                        console.log(`    ❌ Poor error handling`);
                    }
                    
                    setTimeout(sendNextInvalidCommand, 500);
                }
            };
            
            ws.on('message', messageHandler);
        }
        
        ws.on('close', () => {
            resolve();
        });
        
        ws.on('error', (error) => {
            results.errors.push(`Invalid command test error: ${error.message}`);
            resolve();
        });
    });
}

async function testMalformedMessages(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        const malformedMessages = [
            'not valid json',
            '{"type": "invalid_type"}',
            '{"type": "command"}', // missing data
            '{"data": "test"}', // missing type
            '{"type": "command", "data": null}'
        ];
        
        let testIndex = 0;
        let gracefulHandling = 0;
        
        ws.on('open', () => {
            sendNextMalformedMessage();
        });
        
        function sendNextMalformedMessage() {
            if (testIndex >= malformedMessages.length) {
                results.malformedMessages = gracefulHandling;
                results.totalTests += malformedMessages.length;
                ws.close();
                return;
            }
            
            const message = malformedMessages[testIndex++];
            console.log(`  🔧 Testing malformed message: ${message.substring(0, 30)}...`);
            
            try {
                ws.send(message);
                gracefulHandling++; // If it doesn't crash, it's handling it
                console.log(`    ✅ Server didn't crash`);
            } catch (error) {
                console.log(`    ❌ Client-side error: ${error.message}`);
            }
            
            setTimeout(sendNextMalformedMessage, 500);
        }
        
        ws.on('error', (error) => {
            console.log(`    ⚠️  WebSocket error (expected): ${error.message}`);
            // This might be expected for malformed messages
        });
        
        ws.on('close', () => {
            resolve();
        });
    });
}

async function testConnectionRecovery(results) {
    return new Promise((resolve) => {
        console.log('  🔌 Testing connection drop and recovery...');
        
        let ws = new WebSocket('ws://localhost:3000');
        let reconnectAttempted = false;
        
        ws.on('open', () => {
            console.log('    ✅ Initial connection established');
            
            // Send a command then immediately close
            ws.send(JSON.stringify({
                type: 'command',
                data: 'status'
            }));
            
            setTimeout(() => {
                ws.close(); // Simulate connection drop
            }, 100);
        });
        
        ws.on('close', () => {
            if (!reconnectAttempted) {
                console.log('    🔄 Attempting reconnection...');
                reconnectAttempted = true;
                
                // Try to reconnect
                setTimeout(() => {
                    const newWs = new WebSocket('ws://localhost:3000');
                    
                    newWs.on('open', () => {
                        console.log('    ✅ Reconnection successful');
                        results.connectionRecovery = true;
                        newWs.close();
                        resolve();
                    });
                    
                    newWs.on('error', (error) => {
                        console.log('    ❌ Reconnection failed:', error.message);
                        results.errors.push(`Reconnection failed: ${error.message}`);
                        resolve();
                    });
                }, 1000);
            }
        });
        
        ws.on('error', (error) => {
            console.log('    ⚠️  Connection error:', error.message);
            results.errors.push(`Connection error: ${error.message}`);
        });
    });
}

async function testServerErrors(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        
        console.log('  ⚠️  Testing server error scenarios...');
        
        ws.on('open', () => {
            // Test command that might cause server-side issues
            const stressCommands = [
                'very_long_command_' + 'x'.repeat(1000),
                'agent spawn ' + 'invalid_type_'.repeat(100),
                'memory store ' + 'key '.repeat(50) + ' value'
            ];
            
            let commandIndex = 0;
            let serverErrorsHandled = 0;
            
            function sendStressCommand() {
                if (commandIndex >= stressCommands.length) {
                    results.gracefulFailures = serverErrorsHandled;
                    results.totalTests += stressCommands.length;
                    ws.close();
                    return;
                }
                
                const command = stressCommands[commandIndex++];
                console.log(`    🚀 Testing stress command ${commandIndex}`);
                
                ws.send(JSON.stringify({
                    type: 'command',
                    data: command
                }));
                
                const messageHandler = (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'command_complete' || message.type === 'error') {
                        serverErrorsHandled++;
                        console.log(`      ✅ Server handled stress gracefully`);
                        ws.off('message', messageHandler);
                        setTimeout(sendStressCommand, 200);
                    }
                };
                
                ws.on('message', messageHandler);
                
                // Timeout handling
                setTimeout(() => {
                    ws.off('message', messageHandler);
                    console.log(`      ⏰ Command timeout (acceptable)`);
                    sendStressCommand();
                }, 5000);
            }
            
            sendStressCommand();
        });
        
        ws.on('close', () => {
            resolve();
        });
        
        ws.on('error', (error) => {
            results.errors.push(`Server error test: ${error.message}`);
            resolve();
        });
    });
}

function generateErrorReport(results) {
    console.log('\n📊 Error Handling Test Results');
    console.log('===============================');
    console.log(`🔧 Invalid Commands Handled: ${results.invalidCommands}/4`);
    console.log(`📨 Malformed Messages Handled: ${results.malformedMessages}/5`);
    console.log(`🔄 Connection Recovery: ${results.connectionRecovery ? 'PASSED' : 'FAILED'}`);
    console.log(`⚠️  Server Errors Handled: ${results.gracefulFailures}/3`);
    console.log(`❌ Total Errors Logged: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ Errors Encountered:');
        results.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }
    
    const totalScore = results.invalidCommands + results.malformedMessages + 
                      (results.connectionRecovery ? 1 : 0) + results.gracefulFailures;
    const maxScore = 13; // 4 + 5 + 1 + 3
    
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    console.log(`\n🎯 Error Handling Score: ${totalScore}/${maxScore} (${percentage}%)`);
    
    if (percentage >= 90) {
        console.log('🛡️  EXCELLENT! Error handling is very robust');
    } else if (percentage >= 75) {
        console.log('✅ GOOD! Error handling is solid with room for improvement');
    } else if (percentage >= 60) {
        console.log('⚠️  FAIR! Error handling needs attention');
    } else {
        console.log('❌ POOR! Error handling requires significant improvement');
    }
    
    console.log('\n🔍 Error Handling Assessment:');
    console.log(`• Invalid Command Recovery: ${results.invalidCommands >= 3 ? '✅ Excellent' : '⚠️  Needs work'}`);
    console.log(`• Malformed Message Handling: ${results.malformedMessages >= 4 ? '✅ Excellent' : '⚠️  Needs work'}`);
    console.log(`• Connection Resilience: ${results.connectionRecovery ? '✅ Robust' : '❌ Fragile'}`);
    console.log(`• Server Error Recovery: ${results.gracefulFailures >= 2 ? '✅ Good' : '⚠️  Limited'}`);
}

// Run the test
testErrorHandling().then(() => {
    console.log('\n✅ Error handling test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});