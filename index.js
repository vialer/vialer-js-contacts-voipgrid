const ContactsProvider = require('vialer-js/src/js/bg/modules/contacts/provider')

class ContactsProviderVoipgrid extends ContactsProvider {
    constructor() {
        console.log("CUSTOM MODULE!")
    }
}

module.exports = ContactsProviderVoipgrid
