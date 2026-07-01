import imaplib
import email
from email.header import decode_header
import os
from bs4 import BeautifulSoup
from app.services.memory_service import add_memory
from app.utils.logger import get_logger

logger = get_logger(__name__)

async def fetch_unread_emails():
    """
    Connects to the IMAP server, fetches UNREAD emails, strips HTML,
    and ingests them into the Kyro memory graph.
    """
    imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_APP_PASSWORD")

    if not email_user or not email_pass:
        logger.error("IMAP credentials not found in environment variables.")
        return {"status": "error", "message": "IMAP credentials missing in .env"}

    try:
        # Connect to server
        mail = imaplib.IMAP4_SSL(imap_server)
        mail.login(email_user, email_pass)
        
        # Select mailbox (Inbox)
        mail.select("inbox")
        
        # Search for unread emails
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            return {"status": "error", "message": "Failed to search inbox"}
            
        email_ids = messages[0].split()
        ingested_count = 0
        
        for e_id in email_ids:
            # Fetch the email by ID
            res, msg_data = mail.fetch(e_id, "(RFC822)")
            
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    # Decode Subject
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                        
                    # Decode Sender
                    from_ = msg.get("From")
                    
                    # Extract body
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            # Only parse text or html parts, ignore attachments
                            if content_type in ["text/plain", "text/html"] and "attachment" not in content_disposition:
                                try:
                                    payload = part.get_payload(decode=True)
                                    if payload:
                                        body += payload.decode()
                                except Exception:
                                    pass
                    else:
                        try:
                            payload = msg.get_payload(decode=True)
                            if payload:
                                body = payload.decode()
                        except Exception:
                            pass
                            
                    # Clean the body (Strip HTML)
                    soup = BeautifulSoup(body, "html.parser")
                    clean_text = soup.get_text(separator="\n", strip=True)
                    
                    # Ensure it's not totally empty
                    if clean_text:
                        context_data = {
                            "title": f"Email: {subject}",
                            "url": f"email://{from_}",
                            "text": f"From: {from_}\nSubject: {subject}\n\n{clean_text}",
                            "type": "email"
                        }
                        
                        # Ingest into Kyro Memory
                        await add_memory(context_data)
                        ingested_count += 1
                        logger.info(f"Ingested Email: {subject}")
                        
            # Mark as read (optional, can leave commented out for testing)
            # mail.store(e_id, '+FLAGS', '\Seen')
            
        mail.logout()
        return {"status": "success", "message": f"Successfully ingested {ingested_count} emails", "count": ingested_count}
        
    except Exception as e:
        logger.error(f"Error fetching emails: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}
