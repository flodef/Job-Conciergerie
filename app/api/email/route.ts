import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Email } from '@/app/utils/email';

// Configure transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request: Request) {
  try {
    // Send email
    const email: Email = await request.json();
    console.log('Email received:', email);

    await transporter.sendMail({
      from: `Job Conciergerie <${process.env.SMTP_FROM_EMAIL}>`,
      to: email.to,
      subject: email.subject,
      text: 'email.html',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// import { Email } from '@/app/utils/email';
// import { NextResponse } from 'next/server';
// import nodemailer from 'nodemailer';

// export async function POST(request: Request) {
//   try {
//     const email: Email = await request.json();

//     // Configure transporter using environment variables
//     const transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: Number(process.env.SMTP_PORT),
//       secure: true,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASSWORD,
//       },
//     });

//     // Send the email
//     await transporter.sendMail({
//       from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
//       to: email.to,
//       subject: email.subject,
//       html: email.html,
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Error sending email:', error);
//     return NextResponse.json({ success: false, error }, { status: 500 });
//   }
// }
