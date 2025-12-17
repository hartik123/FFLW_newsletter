const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configuration - Update these values
const config = {
    // Your Gmail address
    senderEmail: 'denishsuhagiya18@gmail.com',
    
    // Gmail App Password (NOT your regular password)
    // To get an App Password:
    // 1. Go to https://myaccount.google.com/security
    // 2. Enable 2-Step Verification if not already enabled
    // 3. Go to "App passwords" and generate one for "Mail"
    appPassword: 'yjjy xzre yzhz xnyx',
    
    // Recipient email(s) - can be a single email or array of emails
    recipients: ['hartiksuhagiya10@gmail.com'],
    
    // Email subject
    subject: 'Fight for a Living Wage - Join the Movement!'
};

async function sendNewsletter() {
    try {
        // Read the HTML email template
        const htmlContent = fs.readFileSync(
            path.join(__dirname, 'newsletter-email.html'),
            'utf8'
        );

        // Create a transporter using Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.senderEmail,
                pass: config.appPassword
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✓ Connected to Gmail SMTP server');

        // Email options
        const mailOptions = {
            from: {
                name: 'Fight for a Living Wage',
                address: config.senderEmail
            },
            to: config.recipients,
            subject: config.subject,
            html: htmlContent,
            // Embed the logo image
            attachments: [{
                filename: 'logo.png',
                path: path.join(__dirname, 'image.png'),
                cid: 'logo-image' // Content-ID to reference in HTML
            }],
            // Plain text fallback for email clients that don't support HTML
            text: `
Fight for a Living Wage

More than 35,000 of YOU have signed the Fight for a Living Wage pledge!

Take the pledge today: https://docs.google.com/forms/d/e/1FAIpQLSeplEZqIERFOOZO9OfN5AgSvXFkCwGHl2-W1wB-f0wAlj8CtA/viewform

Hello friend,

In the last year alone, more than 35,000 of you have taken the Fight for a Living Wage pledge. This simple statement about your belief in human dignity allows us to demonstrate that people care about ever-growing economic injustice. Since 2021, our team has been working to educate and advocate for living wage laws.

Nearly one in four American workers (39 million) do not make enough money to afford food, housing, healthcare and other life necessities.

Donate to the cause: https://www.paypal.com/donate/?hosted_button_id=7QMZYMWTMMJMC

Your support is essential and very much appreciated.

Bill
William Meade
Founder and Executive Director
Fight for a Living Wage

---
Fight for a Living Wage is a 501(c)(3) tax-exempt organization.
Your donation is tax-deductible to the extent permitted by law.
            `.trim()
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✓ Email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Sent to:', config.recipients.join(', '));

    } catch (error) {
        console.error('✗ Error sending email:', error.message);
        
        if (error.message.includes('Invalid login')) {
            console.log('\nTip: Make sure you are using a Gmail App Password, not your regular password.');
            console.log('Get an App Password at: https://myaccount.google.com/apppasswords');
        }
    }
}

// Run the script
sendNewsletter();