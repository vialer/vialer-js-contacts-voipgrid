const ContactsProvider = require('vialer-js/bg/plugins/contacts/provider')
const Contact = require('vialer-js/bg/plugins/contacts/contact')


class ContactsProviderVoipgrid extends ContactsProvider {

    constructor(module) {
        super(module)
    }


    /**
    * Load all endpoint data from the vendor platform API and mix
    * and update existing or create new conctacts.
    */
    _platformData() {
        return new Promise(async(resolve, reject) => {
            let res
            this.app.setState({contacts: {status: 'loading'}})
            try {
                res = await this.app.api.client.get('api/phoneaccount/basic/phoneaccount/?active=true&order_by=description')
            } catch (err) {
                return reject(err)
            }

            if (this.app.api.NOTOK_STATUS.includes(res.status)) {
                this.app.logger.warn(`${this}platform data request failed (${res.status})`)
                return
            }

            // Remove the user's own account from the list.
            const ownAccountId = parseInt(this.app.state.settings.webrtc.account.selected.username)

            let voipaccounts = res.data.objects.filter((i) => (i.account_id !== ownAccountId))
            this._syncEndpoints(voipaccounts)
            this.app.setState({contacts: {status: null}})
            this.app.logger.info(`${this}<platform> ${voipaccounts.length} contact endpoints loaded`)
            resolve()
        })
    }


    /**
    * Compare, update and create Contact instances with appropriate state
    * from VoIP-accounts that are listed under a client on
    * the VoIPGRID platform.
    * @param {Array} voipaccounts - The endpoints to check against.
    */
    _syncEndpoints(voipaccounts) {
        let contacts = this.app.state.contacts.contacts
        // Loop over platform endpoint data and match them with
        // existing contact state.
        for (let endpoint of voipaccounts) {
            let endpointMatch = null
            for (const id of Object.keys(contacts)) {
                if (contacts[id].endpoints[endpoint.account_id]) {
                    endpointMatch = {contact: contacts[id], endpoint}
                }
            }

            let contact

            if (endpointMatch) {
                // The contact already exists in state but not as
                // a logical Contact class yet. Hydrate it.
                if (!this.module.contacts[endpointMatch.contact.id]) {
                    contact = new Contact(this.app, endpointMatch.contact)
                    this.module.contacts[contact.id] = contact
                }

            } else {
                // The contact endpoint doesn't exist yet. Create a new Contact with
                // this endpoint as it's only endpoint. Use the name of the
                // endpoint for the default Contact name.
                contact = new Contact(this.app, {
                    endpoints: {
                        [endpoint.account_id]: {
                            active: endpoint.sipreginfo ? true : false,
                            id: endpoint.account_id,
                            name: endpoint.description,
                            number: endpoint.internal_number,
                            status: endpoint.sipreginfo ? 'unavailable' : 'unregistered',
                            ua: endpoint.sipreginfo ? endpoint.sipreginfo.useragent : this.app.$t('not available').capitalize(),
                        },
                    },
                    name: endpoint.description,
                })

                this.module.contacts[contact.id] = contact
            }
        }

        // Persist the updated contact list.
        this.app.setState({contacts: {contacts: this.app.state.contacts.contacts}}, {persist: true})
    }


    /**
    * Generate a representational name for this module. Used for logging.
    * @returns {String} - An identifier for this module.
    */
    toString() {
        return `${this.app}[contacts-voipgrid] `
    }
}

module.exports = ContactsProviderVoipgrid
