import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch"; // Required for sending HTTP requests
import cron from "node-cron";
import nodemailer from "nodemailer"
import sendgrid from "@sendgrid/mail";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000; // Set a default port

app.use(cors());
app.use(express.json());

// API Route to Send Slack Notification On Approval Or Rejection Of Leave Request.
app.post("/send-slack", async (req, res) => {
    const { message } = req.body;
    const SLACK_WEBHOOK_URL = process.env.VITE_SLACK_WEBHOOK_URL;

    if (!SLACK_WEBHOOK_URL) {
        return res.status(500).json({ error: "Slack Webhook URL is missing!" });
    }

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) throw new Error("Failed to send Slack notification");

        return res.status(200).json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});



// Function to send Checkin And CheckOut Reminders On Slack
const sendSlackNotification = async (message) => {
    const SLACK_WEBHOOK_URL = process.env.VITE_SLACK_WEBHOOK_URL; // Add this inside the function

    if (!SLACK_WEBHOOK_URL) {
        console.error("Slack Webhook URL is missing!");
        return;
    }

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) throw new Error("Failed to send Slack notification");

        console.log("Notification sent successfully!");
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

  
// Schedule tasks using cron
cron.schedule("45 8 * * *", () => {
    sendSlackNotification("🌞 Good Morning! Please Don't Forget To Check In.");
  }, {
    timezone: "Asia/Karachi"
  });
  
  cron.schedule("45 16 * * *", () => {
    sendSlackNotification("Hello Everyone! Ensure You Have Checked Out From EMS.");
  }, {
    timezone: "Asia/Karachi"
  });
  
  cron.schedule("45 12 * * *", () => {
    sendSlackNotification("🔔 Reminder: Please Dont Forget To start Break!");
  }, {
    timezone: "Asia/Karachi"
  });
  
  cron.schedule("45 13 * * *", () => {
    sendSlackNotification("🔔 Reminder: Please Dont Forget To End Break!");
  }, {
    timezone: "Asia/Karachi"
  });
  


   
  // Email sending function
  const sendEmail = async (req, res) => {
    const { senderEmail, recipientEmail, subject, employeeName , leaveType , startDate , endDate , reason } = req.body;

    // Create transporter
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // Your email (EMS system email)
            pass: process.env.VITE_EMAIL_PASS, // Your app password
        },
    });

    let message = `
    <p>Dear <strong>Admin</strong>,</p>

    <p>A new leave request has been submitted.</p>

    <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Employee Name:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${employeeName}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Leave Type:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${leaveType}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Start Date:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${startDate}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>End Date:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${endDate}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Reason:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${reason}</td>
        </tr>
    </table>

    <p>Please review and take necessary action.</p>

    <p>Best Regards, <br> <strong>TechCreator EMS System</strong></p>
    `;

    // Email options
    let mailOptions = {
        from: process.env.VITE_EMAIL_USER, // The email that actually sends the email
        to: recipientEmail, // Admin's email
        subject: subject,
        text: message,
        replyTo: senderEmail, // This ensures the admin’s reply goes to the user
    };

    // Send email
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};
// API Route
app.post("/send-email", sendEmail);




const sendAdminResponse = async (req, res) => {
    const {employeeName,  userEmail, leaveType, startDate } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // EMS system email
            pass: process.env.VITE_EMAIL_PASS, // App password
        },
    });


    let message = `
    <p>Dear <strong>${employeeName}</strong>,</p>

    <p>Your leave request has been <strong style="color: green;">Approved</strong>.</p>

    <p><strong>Leave Details:</strong></p>
    <ul>
        <li><strong>Leave Type:</strong> ${leaveType}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
        <li><strong>End Date:</strong> ${startDate}</li>
    </ul>

    <p>Enjoy your time off, and please reach out if you have any questions.</p>

    <p>Best Regards, <br> <strong>TechCreator HR Team</strong></p>
    `;


    let mailOptions = {
        from: process.env.VITE_EMAIL_USER,
        to: userEmail,
        subject: "Leave Request Approved",
        html: message, // Using HTML format for better styling
        replyTo: "contact@techcreator.co",
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Response Email sent: " + info.response);
        res.status(200).json({ message: "Response email sent successfully!" });
    } catch (error) {
        console.error("Error sending response email:", error);
        res.status(500).json({ error: "Failed to send response email" });
    }
};

app.post("/send-response", sendAdminResponse);





//Sending Response To user For Rejected Requests

const sendAdminResponsereject = async (req, res) => {
    const { employeeName, userEmail, leaveType, startDate } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // EMS system email
            pass: process.env.VITE_EMAIL_PASS, // App password
        },
    });

    let message = `
    <p>Dear <strong>${employeeName}</strong>,</p>

    <p>We regret to inform you that your leave request has been <strong style="color: red;">rejected</strong>.</p>

    <p><strong>Leave Details:</strong></p>
    <ul>
        <li><strong>Leave Type:</strong> ${leaveType}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
        <li><strong>End Date:</strong> ${startDate}</li>
    </ul>

    <p>If you have any concerns, please contact HR.</p>

    <p>Best Regards, <br> <strong>TechCreator HR Team</strong></p>
    `;

    let mailOptions = {
        from: process.env.VITE_EMAIL_USER,
        to: userEmail,
        subject: "Leave Request Rejected",
        html: message, // Send as HTML email
        replyTo: "contact@techcreator.co",
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Rejection Email sent: " + info.response);
        res.status(200).json({ message: "Rejection email sent successfully!" });
    } catch (error) {
        console.error("Error sending rejection email:", error);
        res.status(500).json({ error: "Failed to send rejection email" });
    }
};

app.post("/send-rejectresponse", sendAdminResponsereject);


// Start the Server
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
});
