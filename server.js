import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const FROM_NAME = process.env.FROM_NAME || 'Support';

if (!GMAIL_USER || !GMAIL_PASS) {
    console.warn('Warning: GMAIL_USER and GMAIL_PASS are not set. Email will fail until you set them.');
}

// Unified handler for POST and DELETE to accept either method from frontend
async function handleDeleteAccount(req, res) {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    try {
        // === PLACEHOLDER: delete user from your DB ===
        // Example (mongoose): await User.deleteOne({ email });
        // Send confirmation email if credentials are configured
        let emailSent = false;
        if (GMAIL_USER && GMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: GMAIL_USER, pass: GMAIL_PASS }
            });

            // verify transporter to provide clear auth errors early
            try {
                await transporter.verify();
            } catch (verifyErr) {
                console.error('Nodemailer verify failed', verifyErr);
                return res.status(502).json({ success: false, message: 'Email provider authentication failed. Check GMAIL_USER/GMAIL_PASS.' });
            }

            const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#111">
          <h2>Account Permanently Deleted</h2>
          <p>Your account <strong>${email}</strong> has been permanently deleted.</p>
          <p>If you believe this was a mistake contact support.</p>
        </div>
      `;

            try {
                await transporter.sendMail({
                    from: `${FROM_NAME} <${GMAIL_USER}>`,
                    to: email,
                    subject: 'Account Permanently Deleted',
                    html
                });
                emailSent = true;
            } catch (sendErr) {
                console.error('Failed to send confirmation email', sendErr);
                const dev = process.env.NODE_ENV !== 'production';
                const message = dev && sendErr && sendErr.message ? `Failed to send confirmation email: ${sendErr.message}` : 'Failed to send confirmation email';
                return res.status(502).json({ success: false, message });
            }
        } else {
            console.log('Skipping email send: GMAIL_USER / GMAIL_PASS not configured.');
        }

        const message = emailSent
            ? 'Account deleted and confirmation email sent.'
            : 'Account deleted. Confirmation email was skipped because GMAIL_USER/GMAIL_PASS are not configured.';

        return res.json({ success: true, message, emailSent });
    } catch (err) {
        console.error('delete-account error', err);
        const dev = process.env.NODE_ENV !== 'production';
        const message = dev ? (err && err.message ? err.message : 'Server error') : 'Server error';
        return res.status(500).json({ success: false, message });
    }
}

app.post('/api/delete-account', handleDeleteAccount);
app.delete('/api/delete-account', handleDeleteAccount);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
