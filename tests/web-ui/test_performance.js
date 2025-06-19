#!/usr/bin/env node

/**
 * Performance Test for Claude-Flow Console
 * Tests streaming latency, resource usage, and throughput
 */

import WebSocket from 'ws';
import { spawn } from 'child_process';

async function testPerformance() {
    console.log('⚡ Testing Performance and Resource Usage...\n');
    
    const performanceResults = {
        latency: {
            min: Infinity,
            max: 0,
            avg: 0,
            measurements: []
        },
        throughput: {
            commandsPerSecond: 0,
            messagesPerSecond: 0
        },
        memory: {
            before: 0,
            after: 0,
            peak: 0
        },
        streaming: {
            chunkDelay: [],
            totalStreamTime: []
        }
    };
    
    // Get baseline memory usage
    performanceResults.memory.before = process.memoryUsage().heapUsed / 1024 / 1024;
    
    console.log('🚀 Testing Command Latency...');
    await testCommandLatency(performanceResults);
    
    console.log('\n📊 Testing Throughput...');
    await testThroughput(performanceResults);
    
    console.log('\n🌊 Testing Streaming Performance...');
    await testStreamingPerformance(performanceResults);
    
    console.log('\n💾 Testing Memory Usage...');
    await testMemoryUsage(performanceResults);
    
    generatePerformanceReport(performanceResults);
}

async function testCommandLatency(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        const testCommands = ['status', 'help', 'config show', 'memory list', 'agent list'];
        let commandIndex = 0;
        const latencies = [];
        
        ws.on('open', () => {
            measureNextCommand();
        });
        
        function measureNextCommand() {
            if (commandIndex >= testCommands.length) {
                // Calculate statistics
                results.latency.measurements = latencies;
                results.latency.min = Math.min(...latencies);
                results.latency.max = Math.max(...latencies);
                results.latency.avg = latencies.reduce((a, b) => a + b) / latencies.length;
                
                ws.close();
                return;
            }
            
            const command = testCommands[commandIndex++];
            const startTime = performance.now();
            
            console.log(`  ⏱️  Testing latency for: "${command}"`);
            
            ws.send(JSON.stringify({
                type: 'command',
                data: command
            }));
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                if (message.type === 'command_complete') {
                    const latency = performance.now() - startTime;
                    latencies.push(latency);
                    console.log(`    ✅ Latency: ${latency.toFixed(2)}ms`);
                    
                    ws.off('message', messageHandler);
                    setTimeout(measureNextCommand, 100);
                }
            };
            
            ws.on('message', messageHandler);
        }
        
        ws.on('close', () => {
            resolve();
        });
        
        ws.on('error', (error) => {
            console.error('Latency test error:', error.message);
            resolve();
        });
    });
}

async function testThroughput(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        const testDuration = 10000; // 10 seconds
        let commandsSent = 0;
        let messagesReceived = 0;
        let startTime;
        
        ws.on('open', () => {
            startTime = performance.now();
            console.log(`  🚀 Running throughput test for ${testDuration/1000} seconds...`);
            
            // Send commands rapidly
            const commandInterval = setInterval(() => {
                if (performance.now() - startTime >= testDuration) {
                    clearInterval(commandInterval);
                    
                    // Calculate throughput
                    const actualDuration = (performance.now() - startTime) / 1000;
                    results.throughput.commandsPerSecond = commandsSent / actualDuration;
                    results.throughput.messagesPerSecond = messagesReceived / actualDuration;
                    
                    console.log(`    📊 Commands sent: ${commandsSent}`);
                    console.log(`    📨 Messages received: ${messagesReceived}`);
                    
                    setTimeout(() => ws.close(), 1000);
                    return;
                }
                
                ws.send(JSON.stringify({
                    type: 'command',
                    data: 'status'
                }));
                commandsSent++;
            }, 100); // Send every 100ms
        });
        
        ws.on('message', (data) => {
            messagesReceived++;
        });
        
        ws.on('close', () => {
            resolve();
        });
        
        ws.on('error', (error) => {
            console.error('Throughput test error:', error.message);
            resolve();
        });
    });
}

async function testStreamingPerformance(results) {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        let streamStartTime;
        let lastChunkTime;
        const chunkDelays = [];
        
        ws.on('open', () => {
            console.log('  🌊 Testing streaming performance with large output...');
            
            streamStartTime = performance.now();
            lastChunkTime = streamStartTime;
            
            // Send a command that produces a lot of output
            ws.send(JSON.stringify({
                type: 'command',
                data: 'config show'
            }));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            const currentTime = performance.now();
            
            if (message.type === 'output') {
                const chunkDelay = currentTime - lastChunkTime;
                chunkDelays.push(chunkDelay);
                lastChunkTime = currentTime;
            }
            
            if (message.type === 'command_complete') {
                const totalStreamTime = currentTime - streamStartTime;
                
                results.streaming.chunkDelay = chunkDelays;
                results.streaming.totalStreamTime.push(totalStreamTime);
                
                console.log(`    ✅ Stream completed in ${totalStreamTime.toFixed(2)}ms`);
                console.log(`    📊 Average chunk delay: ${(chunkDelays.reduce((a, b) => a + b) / chunkDelays.length).toFixed(2)}ms`);
                
                ws.close();
            }
        });
        
        ws.on('close', () => {
            resolve();
        });
        
        ws.on('error', (error) => {
            console.error('Streaming test error:', error.message);
            resolve();
        });
    });
}

async function testMemoryUsage(results) {
    console.log('  💾 Monitoring memory usage during operations...');
    
    const memorySnapshots = [];
    
    // Take memory snapshots during intensive operations
    const monitorInterval = setInterval(() => {
        const usage = process.memoryUsage().heapUsed / 1024 / 1024;
        memorySnapshots.push(usage);
    }, 100);
    
    // Perform memory-intensive operations
    const operations = Array(50).fill().map((_, i) => {
        return new Promise((resolve) => {
            const ws = new WebSocket('ws://localhost:3000');
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'command',
                    data: `status_${i}`
                }));
            });
            ws.on('message', () => {
                ws.close();
            });
            ws.on('close', () => resolve());
            ws.on('error', () => resolve());
        });
    });
    
    await Promise.all(operations);
    
    clearInterval(monitorInterval);
    
    results.memory.after = process.memoryUsage().heapUsed / 1024 / 1024;
    results.memory.peak = Math.max(...memorySnapshots);
    
    console.log(`    📈 Memory before: ${results.memory.before.toFixed(2)} MB`);
    console.log(`    📈 Memory after: ${results.memory.after.toFixed(2)} MB`);
    console.log(`    📈 Peak memory: ${results.memory.peak.toFixed(2)} MB`);
}

function generatePerformanceReport(results) {
    console.log('\n📊 Performance Test Results');
    console.log('============================');
    
    // Latency Analysis
    console.log(`⚡ Command Latency:`);
    console.log(`  • Minimum: ${results.latency.min.toFixed(2)}ms`);
    console.log(`  • Maximum: ${results.latency.max.toFixed(2)}ms`);
    console.log(`  • Average: ${results.latency.avg.toFixed(2)}ms`);
    
    // Throughput Analysis
    console.log(`\n🚀 Throughput:`);
    console.log(`  • Commands/sec: ${results.throughput.commandsPerSecond.toFixed(2)}`);
    console.log(`  • Messages/sec: ${results.throughput.messagesPerSecond.toFixed(2)}`);
    
    // Streaming Performance
    if (results.streaming.chunkDelay.length > 0) {
        const avgChunkDelay = results.streaming.chunkDelay.reduce((a, b) => a + b) / results.streaming.chunkDelay.length;
        console.log(`\n🌊 Streaming Performance:`);
        console.log(`  • Average chunk delay: ${avgChunkDelay.toFixed(2)}ms`);
        console.log(`  • Total stream time: ${results.streaming.totalStreamTime[0].toFixed(2)}ms`);
    }
    
    // Memory Usage
    const memoryIncrease = results.memory.after - results.memory.before;
    console.log(`\n💾 Memory Usage:`);
    console.log(`  • Memory increase: ${memoryIncrease.toFixed(2)} MB`);
    console.log(`  • Peak usage: ${results.memory.peak.toFixed(2)} MB`);
    
    // Performance Assessment
    console.log(`\n🎯 Performance Assessment:`);
    
    // Latency assessment
    if (results.latency.avg < 50) {
        console.log(`  • Latency: 🟢 EXCELLENT (${results.latency.avg.toFixed(1)}ms avg)`);
    } else if (results.latency.avg < 200) {
        console.log(`  • Latency: 🟡 GOOD (${results.latency.avg.toFixed(1)}ms avg)`);
    } else {
        console.log(`  • Latency: 🔴 NEEDS IMPROVEMENT (${results.latency.avg.toFixed(1)}ms avg)`);
    }
    
    // Throughput assessment
    if (results.throughput.commandsPerSecond > 5) {
        console.log(`  • Throughput: 🟢 EXCELLENT (${results.throughput.commandsPerSecond.toFixed(1)} cmd/s)`);
    } else if (results.throughput.commandsPerSecond > 2) {
        console.log(`  • Throughput: 🟡 GOOD (${results.throughput.commandsPerSecond.toFixed(1)} cmd/s)`);
    } else {
        console.log(`  • Throughput: 🔴 LIMITED (${results.throughput.commandsPerSecond.toFixed(1)} cmd/s)`);
    }
    
    // Memory assessment
    if (memoryIncrease < 10) {
        console.log(`  • Memory Efficiency: 🟢 EXCELLENT (+${memoryIncrease.toFixed(1)} MB)`);
    } else if (memoryIncrease < 50) {
        console.log(`  • Memory Efficiency: 🟡 ACCEPTABLE (+${memoryIncrease.toFixed(1)} MB)`);
    } else {
        console.log(`  • Memory Efficiency: 🔴 CONCERNING (+${memoryIncrease.toFixed(1)} MB)`);
    }
    
    // Overall score
    const latencyScore = results.latency.avg < 50 ? 3 : results.latency.avg < 200 ? 2 : 1;
    const throughputScore = results.throughput.commandsPerSecond > 5 ? 3 : results.throughput.commandsPerSecond > 2 ? 2 : 1;
    const memoryScore = memoryIncrease < 10 ? 3 : memoryIncrease < 50 ? 2 : 1;
    
    const totalScore = latencyScore + throughputScore + memoryScore;
    const maxScore = 9;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    console.log(`\n🏆 Overall Performance Score: ${totalScore}/${maxScore} (${percentage}%)`);
    
    if (percentage >= 85) {
        console.log('🎉 OUTSTANDING! Web UI performance is excellent');
    } else if (percentage >= 70) {
        console.log('✅ GOOD! Web UI performance is solid');
    } else if (percentage >= 55) {
        console.log('⚠️  FAIR! Web UI performance is acceptable but could be improved');
    } else {
        console.log('❌ POOR! Web UI performance needs significant optimization');
    }
}

// Run the performance test
testPerformance().then(() => {
    console.log('\n✅ Performance test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
});