#!/usr/bin/env node

/**
 * Output Streaming Test for Claude-Flow Console
 * Tests real-time output streaming and ANSI color conversion
 */

import WebSocket from 'ws';

async function testOutputStreaming() {
    console.log('🎨 Testing Output Streaming and ANSI Color Conversion...\n');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        const testResults = {
            streamingWorks: false,
            ansiConversion: false,
            htmlFormatting: false,
            realTimeDelivery: false,
            outputMessages: [],
            timestamps: []
        };
        
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket');
            
            // Send a command that should produce formatted output
            console.log('🚀 Sending command: "status"');
            testResults.timestamps.push(Date.now());
            
            ws.send(JSON.stringify({
                type: 'command',
                data: 'status'
            }));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            testResults.timestamps.push(Date.now());
            
            if (message.type === 'output') {
                testResults.outputMessages.push(message.data);
                testResults.streamingWorks = true;
                
                console.log('📨 Output received:', message.data.substring(0, 100) + '...');
                
                // Check for ANSI conversion to HTML
                if (message.data.includes('<span class=')) {
                    testResults.ansiConversion = true;
                    console.log('  ✅ ANSI to HTML conversion detected');
                }
                
                // Check for specific color classes
                if (message.data.match(/<span class="(success|error|warning|info|dim)"/)) {
                    testResults.htmlFormatting = true;
                    console.log('  ✅ Proper HTML color formatting detected');
                }
                
                // Check for timestamp formatting
                if (message.data.includes('<span class="dim">')) {
                    console.log('  ✅ Timestamp formatting detected');
                }
            }
            
            if (message.type === 'command_complete') {
                console.log('🏁 Command completed');
                
                // Check real-time delivery (should be fast)
                const totalTime = testResults.timestamps[testResults.timestamps.length - 1] - testResults.timestamps[0];
                testResults.realTimeDelivery = totalTime < 5000; // Less than 5 seconds
                
                console.log(`⏱️  Total response time: ${totalTime}ms`);
                
                ws.close();
            }
        });
        
        ws.on('close', () => {
            console.log('\n📊 Output Streaming Test Results:');
            console.log('===================================');
            console.log('✅ Streaming Works:', testResults.streamingWorks);
            console.log('✅ ANSI Conversion:', testResults.ansiConversion);
            console.log('✅ HTML Formatting:', testResults.htmlFormatting);
            console.log('✅ Real-time Delivery:', testResults.realTimeDelivery);
            console.log('📨 Output Messages:', testResults.outputMessages.length);
            
            if (testResults.outputMessages.length > 0) {
                console.log('\n🎨 Sample Formatted Output:');
                console.log('----------------------------');
                console.log(testResults.outputMessages[0]);
                
                console.log('\n🔍 HTML Elements Found:');
                const spans = testResults.outputMessages.join('').match(/<span class="[^"]*">/g) || [];
                const uniqueClasses = [...new Set(spans.map(span => span.match(/class="([^"]*)"/)?.[1]))];
                uniqueClasses.forEach(cls => console.log(`  • ${cls}`));
            }
            
            const score = [
                testResults.streamingWorks,
                testResults.ansiConversion,
                testResults.htmlFormatting,
                testResults.realTimeDelivery
            ].filter(Boolean).length;
            
            console.log(`\n🎯 Score: ${score}/4 streaming tests passed`);
            
            if (score === 4) {
                console.log('🎉 Output streaming is working PERFECTLY!');
            } else if (score >= 3) {
                console.log('✅ Output streaming is working WELL!');
            } else {
                console.log('⚠️  Output streaming needs improvement');
            }
            
            resolve(testResults);
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            resolve(testResults);
        });
    });
}

// Run the test
testOutputStreaming().then(() => {
    console.log('\n✅ Output streaming test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});