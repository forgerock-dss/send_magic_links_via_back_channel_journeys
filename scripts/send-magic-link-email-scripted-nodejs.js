/**
 * @file This script sends a templated magiclink to a user via the IDM's configured email service
 * using the openidm binding in next-gen scripting
 * NOTE - The use of SendGrid is not supported in Production and must be changed to your own email service
 * Steps are here: https://backstage.forgerock.com/docs/idcloud/latest/tenants/email-provider.html#external_smtp_email_server
 * @version 0.1.0
 * @keywords email mail magiclink sharedState transientState templateService
 */

/**
 * Script configuration
*/
var config = {

    templateID: "changePassword",
    idmEndpoint: "external/email",
    idmAction: "sendTemplate"
};

/**
 * Node outcomes
*/
var nodeOutcome = {
    SUCCESS: "Success",
    FAILED: "Failed"
};

/**
 * Send email via the IDM Email Service openidm binding in next-gen scripting
 * 
 * @param {string} id - _id of user from sharedShare
 * @param {string} email - mail attribute from sharedState
 * @param {string} suspendLink - suspendLink containing the transactionId of the back channel journey and suspendId to continue the front channel journey
 */

function sendMail(id, email, suspendLink) {
  try {
    var templateId = config.templateID;
    var idmEndpoint = config.idmEndpoint;
    var idmAction = config.idmAction;
    var identity = idRepository.getIdentity(id);
    var givenName = identity.getAttributeValues("givenName").toArray()[0];
    var params = new Object();

    params.templateName = templateId;
    params.to = email;
    params.object = {
      "givenName": givenName,
      "resumeURI": suspendLink
    };

    openidm.action(idmEndpoint, idmAction, params);
    logger.debug(scriptName + "Email send successfully");
    return "true";
  }
  catch (e) {
    //Note script defaults to display user message on screen and does not follow the Failed outcome
    logger.error(scriptName + ": Failed to call IDM Email endpoint using template. Exception is: " + e);
    return "false";
  }
};

/**
 * Main function
 */
(function () {
  logger.error(scriptName + ": Node execution started");
  var email;
  var suspendLink;
  var backchannelUrl;

  if (!(backchannelUrl = nodeState.get("backchannel-redirectUri"))) {
    logger.error(scriptName + ": Unable to get backchannel-redirectUri from sharedState");
    action.goTo(nodeOutcome.FAILED);
    return;
  }

  if (!(email = nodeState.get("objectAttributes").get("mail"))) {
    logger.error(scriptName + ": Unable to get mail from the objectAttributes sharedState attribute");
    action.goTo(nodeOutcome.FAILED);
    return;
  }

  if (!(id = nodeState.get("_id"))) {
    logger.error(scriptName + ": Unable to get _id from sharedState attribute");
    action.goTo(nodeOutcome.FAILED);
    return;
  }
  
  if (resumedFromSuspend) {
    logger.error(scriptName + ": Node execution completed.");
    action.goTo(nodeOutcome.SUCCESS);
  } 
  
  else {
    //Send a message to display to the user and the URL to construct resume the journey
    action.suspend('If a user account exists, you’ll receive an email with a magic sign-in link. The link is valid for 1 hour.', (resumeUri) => {
      suspendLink = backchannelUrl + "&goto=" + encodeURIComponent(resumeUri);
      sendMail(id, email, suspendLink);
    });
  }
})();