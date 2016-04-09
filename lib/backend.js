"use strict";

const events = require( 'events' );
const Pushover = require( './pushover.js' );

class PushoverBackend extends events.EventEmitter {

	constructor( options ) {

		super();

		// TODO: Test options

		// Store options
		this._push = new Pushover( 'https://api.pushover.net/1/', options.token );
		this._msgError = options.msgError;
		this._msgAck = options.msgAck;
		this._msgRecover = options.msgRecover;

		// Set up stores
		this._pollAcks = {};

		this._poll();

	}

	_poll() {

		let jobs = [];

		for( let p in this._pollAcks ) {
			let poll = this._pollAcks[p];

			// Ask API if the user has acked the message
			jobs.push( this._push.checkReceipt( poll.receipt ).then( ( acked ) => {

				if( ! acked ) return;

				// If the user acked the message emit ack event for hormone name
				this.emit( 'ack_' + poll.name, poll.recipient );

				// Remove the user from poll object
				delete this._pollAcks[ p ];

			} ) );

		}

		// Wait for all polling jobs to be finished
		Promise.all( jobs ).then( () => {
			// Poll again in 10s
			setTimeout( () => this._poll(), 5000 );
		} );

	}

	error( recipient, name, hormone ) {

		// Send emergancy message
		this._push.msgEmergancy(
			recipient.id,
			"ERROR",
			this._msgError( name, hormone )
		).then( ( receipt ) => {

			// Store receipt
			this._pollAcks[ name + '_' + recipient.id ] = {
				receipt: receipt,
				recipient: recipient,
				name: name
			};

		} ).catch( console.error );

	}

	acknowledge( recipient, name, user ) {

		let pollHandle = name + '_' + recipient.id;

		// Cancel emergancy message
		if( this._pollAcks[ pollHandle ] ) {
			this._push.cancelEmergancy( this._pollAcks[ pollHandle ].receipt ).then( () => {
				delete this._pollAcks[ pollHandle ];
			} );
		}

		// Send acknowledge message
		this._push.msg(
			recipient.id,
			"ACKOWNLEDGED",
			this._msgAck( name, user )
		);

	}

	recover( recipient, name ) {

		let pollHandle = name + '_' + recipient.id;

		// Cancel emergancy message
		if( this._pollAcks[ pollHandle ] ) {
			this._push.cancelEmergancy( this._pollAcks[ pollHandle ].receipt ).then( () => {
				delete this._pollAcks[ pollHandle ];
			} );
		}

		// Send acknowledge message
		this._push.msg(
			recipient.id,
			"RECOVER",
			this._msgRecover( name  )
		);

	}

}

module.exports = PushoverBackend;
