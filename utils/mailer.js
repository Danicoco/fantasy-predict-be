const brevo = require('@getbrevo/brevo');

 exports.Mailer = (email, subject, html, name) => {


  let defaultClient = brevo.ApiClient.instance;

  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.SMS_API_KEY;
  
  let apiInstance = new brevo.TransactionalEmailsApi();
  let sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.sender = { "name": "Fantasy Predict", "email": "" };
  sendSmtpEmail.to = [
    { "email": email, "name": name }
  ];
  sendSmtpEmail.replyTo = { "email": "", "name": "sample-name" };
  sendSmtpEmail.headers = { "Some-Custom-Name": "" };
  // sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };
  
  
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
  }, function (error) {
    console.error(error);
  });
}


