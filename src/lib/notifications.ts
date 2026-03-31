// Utility functions for sending notifications to Telegram and Line

/**
 * Send a notification to Telegram
 * @param bookingData Booking data to include in the notification
 */
export async function sendTelegramNotification(bookingData: any) {
    if (process.env.TELEGRAM_ENABLED !== 'true') {
      console.log('Telegram notification skipped (TELEGRAM_ENABLED=false)');
      return null;
    }

    try {
      const telegramToken = process.env.TELEGRAM_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
  
      // Format date and time - expected format: dd/mm/yyyy
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Date is already in dd/mm/yyyy format, so we can return it as is
        return dateStr;
      };
  
      // Format message with booking details
      const message = `📝 *มีการขอใช้รถ*
  เลขที่ขอใช้รถ : **${bookingData.bookingNumber}**
  ผู้ขอ : ${bookingData.requesterName} 
  ไปที่ : ${bookingData.destination} 
  เพื่อ : ${bookingData.purpose} 
  ผู้ร่วมเดินทาง : ${bookingData.travelers}
  ไป : ${formatDate(bookingData.departureDate)} เวลา ${bookingData.departureTime} 
  กลับ : ${formatDate(bookingData.returnDate)} เวลา ${bookingData.returnTime} 
  ${process.env.APP_URL}`;
  
      // Send the message to Telegram
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
  
      const result = await response.json();
      console.log('Telegram notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      throw error;
    }
  }
  
  /**
   * Send a notification to Line
   * @param bookingData Booking data for reference (not all details are included in Line messages)
   */
  export async function sendLineNotification(bookingData: any) {
    if (process.env.LINE_ENABLED !== 'true') {
      console.log('LINE notification skipped (LINE_ENABLED=false)');
      return null;
    }

    try {
      const token = process.env.LINE_TOKEN;
      const userIds = [
        process.env.LINE_USER_ID_1, // ของผอ
        process.env.LINE_USER_ID_2  // ของภิรมณ์
      ];
  
      const url = 'https://api.line.me/v2/bot/message/multicast';
      
      // Prepare the message text
      const message = `มีผู้ขอใช้บริการรถยนต์
  โปรดพิจารณาอนุมัติ
  ${process.env.APP_URL}`;
  
      // Send the message to Line
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: userIds,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        })
      });
  
      const result = await response.json();
      console.log('Line notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending Line notification:', error);
      throw error;
    }
  }