const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configuration - Update these values
const config = {
    // Your Gmail address
    senderEmail: 'denishsuhagiya18@gmail.com',
    
    // Gmail App Password (NOT your regular password)
    appPassword: 'uvbz acme tilx doyw',
    
    // Email subject
    subject: 'Fight for a Living Wage - Join the Movement!',
    
    // Batch size
    batchSize: 5,
    
    // Delay between emails (ms) to avoid rate limiting
    delayBetweenEmails: 2000,
    
    // Progress file to track sent emails
    progressFile: path.join(__dirname, 'email-progress.json')
};

// Load progress from file
function loadProgress() {
    try {
        if (fs.existsSync(config.progressFile)) {
            const data = fs.readFileSync(config.progressFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('No previous progress found, starting fresh.');
    }
    return { lastIndex: 0, sentEmails: [], failedEmails: [] };
}

// Save progress to file
function saveProgress(progress) {
    fs.writeFileSync(config.progressFile, JSON.stringify(progress, null, 2));
}

// Parse CSV file and extract emails
function parseCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const emails = [];
    
    // Find where the actual data starts (skip header rows)
    let dataStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Look for lines that start with a date pattern (data rows)
        if (line.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
            dataStartIndex = i;
            break;
        }
    }
    
    console.log(`📋 Data starts at line: ${dataStartIndex + 1}`);
    
    // Process data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Extract email (second column after date)
        // Format: date,email,pledge,name,lastname,status
        const match = line.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2},([^,]+),/);
        if (match && match[1]) {
            const email = match[1].trim();
            // Basic email validation
            if (email.includes('@') && email.includes('.')) {
                emails.push(email);
            }
        }
    }
    
    return emails;
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a single email
async function sendSingleEmail(transporter, recipient, htmlContent, plainText) {
    const mailOptions = {
        from: {
            name: 'Fight for a Living Wage',
            address: config.senderEmail
        },
        to: recipient,
        subject: config.subject,
        html: htmlContent,
        attachments: [{
            filename: 'logo.jpg',
            path: path.join(__dirname, 'image.jpg'),
            cid: 'logo-image'
        }],
        text: plainText
    };
    
    return transporter.sendMail(mailOptions);
}

// Main function to send batch emails
async function sendBatchEmails(csvPath) {
    try {
        // Load HTML template
        const htmlContent = fs.readFileSync(
            path.join(__dirname, 'newsletter-email.html'),
            'utf8'
        );
        
        const plainText = `
Fight for a Living Wage

More than 35,000 of YOU have signed the Fight for a Living Wage pledge!

Take the pledge today: https://docs.google.com/forms/d/e/1FAIpQLSeplEZqIERFOOZO9OfN5AgSvXFkCwGHl2-W1wB-f0wAlj8CtA/viewform

Hello friend,

In the last year alone, more than 35,000 of you have taken the Fight for a Living Wage pledge.

Donate to the cause: https://www.paypal.com/donate/?hosted_button_id=7QMZYMWTMMJMC

Your support is essential and very much appreciated.

Bill
William Meade
Founder and Executive Director
Fight for a Living Wage
        `.trim();

        // Parse CSV and get all emails
        const allEmails = parseCSV(csvPath);
        console.log(`📧 Total emails in CSV: ${allEmails.length}`);
        
        // Load progress
        const progress = loadProgress();
        console.log(`📍 Last sent index: ${progress.lastIndex}`);
        console.log(`✅ Previously sent: ${progress.sentEmails.length}`);
        console.log(`❌ Previously failed: ${progress.failedEmails.length}`);
        
        // Calculate batch to send
        const startIndex = progress.lastIndex;
        const endIndex = Math.min(startIndex + config.batchSize, allEmails.length);
        const batchEmails = allEmails.slice(startIndex, endIndex);
        
        if (batchEmails.length === 0) {
            console.log('\n✅ All emails have been sent!');
            console.log(`Total sent: ${progress.sentEmails.length}`);
            console.log(`Total failed: ${progress.failedEmails.length}`);
            return;
        }
        
        console.log(`\n📤 Sending batch: ${startIndex + 1} to ${endIndex} (${batchEmails.length} emails)`);
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.senderEmail,
                pass: config.appPassword
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✓ Connected to Gmail SMTP server\n');

        // Send emails one by one
        let sentCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < batchEmails.length; i++) {
            const email = batchEmails[i];
            const currentIndex = startIndex + i;
            
            try {
                await sendSingleEmail(transporter, email, htmlContent, plainText);
                progress.sentEmails.push({ email, index: currentIndex, timestamp: new Date().toISOString() });
                sentCount++;
                console.log(`✓ [${currentIndex + 1}/${allEmails.length}] Sent to: ${email}`);
            } catch (error) {
                progress.failedEmails.push({ email, index: currentIndex, error: error.message, timestamp: new Date().toISOString() });
                failedCount++;
                console.log(`✗ [${currentIndex + 1}/${allEmails.length}] Failed: ${email} - ${error.message}`);
            }
            
            // Update progress after each email
            progress.lastIndex = currentIndex + 1;
            saveProgress(progress);
            
            // Delay to avoid rate limiting
            if (i < batchEmails.length - 1) {
                await sleep(config.delayBetweenEmails);
            }
        }

        // Final summary
        console.log('\n========== BATCH COMPLETE ==========');
        console.log(`✅ Sent this batch: ${sentCount}`);
        console.log(`❌ Failed this batch: ${failedCount}`);
        console.log(`📍 Current position: ${progress.lastIndex}/${allEmails.length}`);
        console.log(`📊 Total sent overall: ${progress.sentEmails.length}`);
        console.log(`📊 Total failed overall: ${progress.failedEmails.length}`);
        
        if (progress.lastIndex < allEmails.length) {
            console.log(`\n⏭️ Run the script again to send the next batch (${allEmails.length - progress.lastIndex} remaining)`);
        } else {
            console.log('\n🎉 All emails have been sent!');
        }

    } catch (error) {
        console.error('✗ Error:', error.message);
        
        if (error.message.includes('Invalid login')) {
            console.log('\nTip: Make sure you are using a Gmail App Password, not your regular password.');
        }
    }
}

// Reset progress (use with caution)
function resetProgress() {
    if (fs.existsSync(config.progressFile)) {
        fs.unlinkSync(config.progressFile);
        console.log('✓ Progress reset successfully');
    } else {
        console.log('No progress file to reset');
    }
}

// Get current status
function getStatus(csvPath) {
    const allEmails = parseCSV(csvPath);
    const progress = loadProgress();
    
    console.log('\n========== EMAIL STATUS ==========');
    console.log(`📧 Total emails in CSV: ${allEmails.length}`);
    console.log(`📍 Current position: ${progress.lastIndex}`);
    console.log(`✅ Sent: ${progress.sentEmails.length}`);
    console.log(`❌ Failed: ${progress.failedEmails.length}`);
    console.log(`⏳ Remaining: ${allEmails.length - progress.lastIndex}`);
    
    if (progress.failedEmails.length > 0) {
        console.log('\n--- Failed Emails ---');
        progress.failedEmails.forEach(f => {
            console.log(`  ${f.email}: ${f.error}`);
        });
    }
}

// Command line interface
const args = process.argv.slice(2);
const csvPath = path.join(__dirname, 'Final List.csv');

if (args[0] === 'reset') {
    resetProgress();
} else if (args[0] === 'status') {
    getStatus(csvPath);
} else {
    sendBatchEmails(csvPath);
}
