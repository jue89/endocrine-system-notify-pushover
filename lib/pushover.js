"use strict";

const https = require( 'https' );
const url = require( 'url' );
const querystring = require( 'querystring' );

class Pushover {

	constructor( api, token ) {

		this._api = api;
		this._token = token;

		// Create a new agent for requests
		this._agent = new https.Agent( {
			keepAlive: true,
			keepAliveMsecs: 10000,
			maxSockets: 1,
			maxFreeSockets: 1
		} );

	}

	_request( method, endpoint, data ) {

		// Append data to endpoint if we are about to send a GET request
		if( method === 'GET' && data ) {
			endpoint += '?' + querystring.stringify( data );
			data = null;
		}

		// Create options object
		let options = url.parse( this._api + endpoint );
		options.method = method;
		options.agent = this._agent;
		options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

		return new Promise( ( resolve, reject ) => {

			// Create new request
			let req = https.request( options, ( res ) => {

				let data = '';

				res.on( 'data', ( chunk ) => {
					data += chunk.toString();
				} );

				res.on( 'end', () => {
					try {
						resolve( JSON.parse( data ) );
					} catch( e ) {
						reject( new Error( "Unkown data!" ) );
					}
				} );

			} );

			// Send body if it has been handed over
			if( data ) req.write( querystring.stringify( data ) );

			req.end();

		} );

	}

	_message( user, title, message, priority ) {

		return this._request( 'POST', 'messages.json', {
			token: this._token,
			user: user,
			title: title,
			message: message,
			priority: priority
		} );

	}

	msg( user, title, message ) {

		return this._request( 'POST', 'messages.json', {
			token: this._token,
			user: user,
			title: title,
			message: message,
			priority: 0
		} ).then( ( res ) => {
			if( res.status == 1 ) return;
			else return Promise.reject( res.errors );
		} );

	}

	msgEmergancy( user, title, message ) {

		return this._request( 'POST', 'messages.json', {
			token: this._token,
			user: user,
			title: title,
			message: message,
			priority: 2,
			retry: 600,
			expire: 3600
		} ).then( ( res ) => {
			if( res.status == 1 ) return res.receipt;
			else return Promise.reject( res.errors );
		} );

	}

	cancelEmergancy( receipt ) {

		return this._request( 'POST', 'receipts/' + receipt + '/cancel.json', {
			token: this._token
		} ).then( ( res ) => {
			if( res.status == 1 ) return;
			else return Promise.reject( res.errors );
		} );

	}

	checkReceipt( receipt ) {

		return this._request( 'GET', 'receipts/' + receipt + '.json', {
			token: this._token
		} ).then( ( res ) => {
			if( res.status == 1 ) return res.acknowledged === 1;
			else return Promise.reject( res.errors );
		} );

	}

}

module.exports = Pushover;
