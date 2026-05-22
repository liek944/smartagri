import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Email utility — sends styled HTML receipt emails via Gmail SMTP.
// Requires SMTP_EMAIL and SMTP_PASSWORD (Google App Password) in .env.
// ---------------------------------------------------------------------------

// Lazy singleton — created on first use so that dotenv has already loaded by
// the time we read SMTP_EMAIL / SMTP_PASSWORD from process.env.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }
  return _transporter;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  items: ReceiptItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryLocation: string;
  phoneNumber: string;
  orderDate: string;
  paymentMethod: string;
}

function buildReceiptHtml(data: ReceiptData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">
          ${item.name}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#6b7280;text-align:center;">
          ×${item.quantity}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;font-weight:600;">
          ₱${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>`
    )
    .join('');

  const orderIdShort = data.orderId.slice(-8).toUpperCase();
  const dateFormatted = new Date(data.orderDate).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your SmartAgriCraft Receipt</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#166534 0%,#15803d 50%,#22c55e 100%);padding:40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background-color:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;line-height:56px;font-size:28px;">
                ✓
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Payment Successful!
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);font-weight:500;">
                Thank you for supporting local traders, ${data.buyerName}.
              </p>
            </td>
          </tr>

          <!-- Order ID + Date bar -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">
                    Order ID
                    <br />
                    <span style="font-size:15px;color:#111827;letter-spacing:0;text-transform:none;">#${orderIdShort}</span>
                  </td>
                  <td style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;text-align:right;">
                    Date
                    <br />
                    <span style="font-size:13px;color:#6b7280;letter-spacing:0;text-transform:none;">${dateFormatted}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items table -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">
                Order Summary
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding:8px 16px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;text-align:left;border-bottom:2px solid #e5e7eb;">Item</th>
                    <th style="padding:8px 16px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                    <th style="padding:8px 16px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;text-align:right;border-bottom:2px solid #e5e7eb;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:16px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:16px;padding:16px;">
                <tr>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;">Subtotal</td>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;text-align:right;">₱${data.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;">Delivery Fee</td>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;text-align:right;">₱${data.deliveryFee.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;">Payment</td>
                  <td style="padding:6px 16px;font-size:13px;color:#6b7280;font-weight:600;text-align:right;">GCash</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 16px 0;">
                    <div style="border-top:2px solid #e5e7eb;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:18px;color:#166534;font-weight:800;">TOTAL PAID</td>
                  <td style="padding:12px 16px;font-size:18px;color:#166534;font-weight:800;text-align:right;">₱${data.total.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery info -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:16px;padding:16px;border:1px solid #dbeafe;">
                <tr>
                  <td style="padding:8px 16px;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:1.5px;">
                      📍 Delivery Details
                    </p>
                    <p style="margin:8px 0 4px;font-size:14px;color:#1e40af;font-weight:600;">
                      ${data.deliveryLocation}
                    </p>
                    <p style="margin:0;font-size:13px;color:#60a5fa;font-weight:500;">
                      Contact: ${data.phoneNumber || 'N/A'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#166534;">
                SmartAgriCraft
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                Roxas, Oriental Mindoro &bull; Supporting Local Traders
                <br />
                This is an automated receipt. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a receipt email to the buyer after a successful GCash payment.
 * This is fire-and-forget — it logs errors but never throws, so it won't
 * block the payment redirect if the mail server is slow or misconfigured.
 */
export async function sendReceiptEmail(data: ReceiptData): Promise<void> {
  console.log(`[Email] Debug — SMTP_EMAIL: "${process.env.SMTP_EMAIL}", SMTP_PASSWORD present: ${!!process.env.SMTP_PASSWORD} (len: ${process.env.SMTP_PASSWORD?.length})`);

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('[Email] SMTP credentials not configured — skipping receipt email.');
    return;
  }

  const orderIdShort = data.orderId.slice(-8).toUpperCase();

  try {
    const info = await getTransporter().sendMail({
      from: `SmartAgriCraft <${process.env.SMTP_EMAIL}>`,
      to: data.buyerEmail,
      subject: `🧾 Your SmartAgriCraft Receipt — Order #${orderIdShort}`,
      html: buildReceiptHtml(data),
    });
    console.log(`[Email] Receipt sent to ${data.buyerEmail} (messageId: ${info.messageId})`);
  } catch (error) {
    // Log but don't throw — email failure should never block the payment flow
    console.error(`[Email] Failed to send receipt to ${data.buyerEmail}:`, error);
  }
}
