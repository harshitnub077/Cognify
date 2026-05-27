import axios from 'axios';
import prisma from './src/lib/prisma';

async function testAnalyze() {
    // get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found to test with.');
        return;
    }
    
    console.log('Testing with user:', user.email);
    
    // Create a mock token or bypass auth for testing. 
    // Since we can't easily mock the JWT, we'll test the service directly bypassing the route,
    // or we could just invoke the NLP service directly to see if it's up.
    
    try {
        const response = await axios.post('http://localhost:8001/analyze', {
            url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
            user_goals: ["productivity"]
        });
        console.log('NLP Response:', response.data);
    } catch (e: any) {
        console.error('NLP Error:', e.message);
    }
}

testAnalyze().finally(() => prisma.$disconnect());
