import { Router } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

const router = Router();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Google OAuth credentials are required');
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co'
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    oauth2Client.setCredentials({ access_token });

    const { data } = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });

    if (!data.email) {
      return res.status(400).json({ error: 'Email not found in Google profile' });
    }

    // Create or update user in database
    const user = {
      id: 1, // TODO: Replace with actual user management
      email: data.email,
      name: data.name || 'User',
      picture: data.picture,
    };

    // Create session token
    const token = jwt.sign(user, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.cookie('session', token, { httpOnly: true, secure: true });

    res.json({ user });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ success: true });
});

router.get('/session', (req, res) => {
  const token = req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid session' });
  }
});

export default router;