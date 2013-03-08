// Store Mongo's `room` collection.
// Store Mongo's `messages` collection.
// Store servers time.
var Rooms = new Meteor.Collection( 'rooms' )
  , Messages = new Meteor.Collection( 'messages' )
  , time = null
  ;

if ( Meteor.isClient )
{
	// == Set-up ===============================================================
	Meteor.call( 'server:time', function( error, serverTime )
		{
			time = serverTime;
		}
	);
	
	// == Utilities ============================================================
	// -- Rooms ----------------------------------------------------------------
	_rooms = {};

	//  * Create
	_rooms.create = function create( room )
	{
		Meteor.call( 'rooms:create', room, Session.get( 'name' ) )
	}

	//  * Read
	_rooms.read = function read( name )
	{
		if ( name )
			return Rooms.findOne( { 'name' : name } );
		else
			return Rooms.find();
	}
	
	//  * Update.

	//  * Delete
	_rooms.delete = function _delete( id )
	{
		Meteor.call( 'rooms:delete', id )
	}

	// -- Messages -------------------------------------------------------------
	_messages = {};

	//  * Create
	_messages.create = function create( value )
	{
		Meteor.call( 'messages:create', Session.get( 'room' ), Session.get( 'name' ), value );
	}

	//  * Read
	_messages.read = function read()
	{
		return Messages.find(
			  { 'room' : Session.get( 'room' ) }
			, { 'sort' : { 'timestamp' : -1 } }
		);
	}
	
	//  * Update.

	//  * Delete
	_messages.delete = function _delete( _id )
	{
		Meteor.call( 'messages:delete', _id );
	}


	// == Sound ================================================================

	// -- Constructor ----------------------------------------------------------
	function Sound( source, level )
	{
		if ( !window.audioContext)
			audioContext = new webkitAudioContext();

		var _this = this;

		_this.source = source;
		_this.buffer = null;
		_this.isLoaded = false;
		_this.panner = audioContext.createPanner();
		_this.volume = audioContext.createGainNode();

		_this.volume.gain.value = level? level : 1;

		var getSound = Base64Binary.decodeArrayBuffer( _this.source );

		audioContext.decodeAudioData( getSound, function( buffer )
			{
				_this.buffer = buffer;
				_this.isLoaded = true;
			}
		);
	}

	// -- Prototype ------------------------------------------------------------
	//  * Play
	Sound.prototype.play = function play()
	{
		// If the sound is loaded...
		if ( this.isLoaded )
		{
			var playSound = audioContext.createBufferSource();

			playSound.buffer = this.buffer;
			playSound.connect( this.panner );

			this.panner.connect( this.volume );

			this.volume.connect( audioContext.destination );

			playSound.noteOn( 0 );
		}

		// Return the context so we can work with it later!
		return playSound;
	}

	Sound.prototype.setVolume = function setVolume( level )
	{
		this.volume.gain.value = level;
	}

	Sound.prototype.setPan = function setPan( x, y, z )
	{
		this.panner.setPosition( x, y, z );
	}

	// Pass the returned playSound context (from Sound.prototype.play) in order
	// to stop sound playback.
	Sound.prototype.killSound = function killSound( context )
	{
		context.noteOff( 0 );
	}

	// How-to's:
	// tag    = new Sound( Blog_Tag );
	// click  = new Sound( itfc_click, 0.8 );
	// buy    = new Sound( itfc_buy_item );
	// cancel = new Sound( itfc_item_cancel );



	// == Templates ============================================================

	// -- Events ---------------------------------------------------------------
	//  * Rooms
	Template.rooms.events = {
		  'click #addRoom' : function onclick()
		{
			var room

			if ( room = prompt( 'Name the room', 'My room' ) )
				_rooms.create( room );
		}
		, 'click .enter': function onclick()
		{
			page( '/' + this.name );
		}
		, 'click .delete': function onclick()
		{
			_rooms.delete( this._id );

			return false;
		}
	};

	//  * Room
	Template.room.events = {
		  'click #leave': function onclick()
		{
			page( '/' );
		}
		, 'click #notify': function onclick()
		{
			if ( !webkitNotifications )
				return;

			permission = webkitNotifications.checkPermission();

			if ( permission === 2 )
				return alert( 'You disallowed this website to show alert.' );

			Session.set( 'notify', permission === 0 );

			if ( permission === 0 )
				return;

			webkitNotifications.requestPermission( function()
				{
					Session.set( 'notify', webkitNotifications.checkPermission() === 0 );

					if ( Session.equals( 'notify', true ) )
						document.querySelector( '#notify' ).classList.add( 'active' )
				}
			);
		}
		, 'click #signout': function onclick()
		{
			Session.set( 'name', undefined );
		}
		, 'submit #signup': function onsubmit()
		{
			var $username = document.querySelector( '#username' )

			if ( $username.value )
				Session.set( 'name', $username.value );

			return false;
		}
		, 'submit #create': function onsubmit()
		{
			var $message = document.querySelector( '#message' )

			if ( $message.value )
				_messages.create( $message.value );

			$message.value = '';
			$message.focus();

			Meteor.flush();

			return false;
		}
		, 'click .delete': function onclick()
		{
			_messages.delete( this._id )
		}
	};

	// -- Helpers --------------------------------------------------------------
	//  * GLOBAL
	// Return if the user is logged in.
	Handlebars.registerHelper('isLoggedIn', function isLoggedIn()
		{
			return Session.get( 'name' ) != null;
		}
	);

	//  * Main
	// Return the current room or false.
	Template.main.room = function room()
	{
		return Session.get( 'room' ) || false;
	};
	
	//  * Rooms
	// Return the current room or false.
	Template.rooms.rooms = function availableRooms()
	{
		return _rooms.read;
	};
	
	//  * Room
	// Return messages in the current room, sorted by newest to oldest.
	Template.room.messages = function messages()
	{
		return _messages.read();
	};

	// Return current user.
	Template.room.user = function user()
	{
		return Session.get( 'name' );
	};
	
	
	// Template.room.isLoggedIn = 
	
	// Return if the user is logged in.
	Template.room.hasNotificationsEnabled = function hasNotificationsEnabled()
	{
		return Session.equals( 'notify', true );
	};

	// Return if the author of the context's message is the current user
	Template.room.isAuthor = function isAuthor()
	{
		return Session.get( 'name' ) != null && Session.equals( 'name', this.author )
	};
	
	// Return a formatted version of the context's timestamp.
	Template.room.timestamp = function timestamp()
	{
		return strftime( '%a, %b %e %r', new Date( this.timestamp ) );
	};
	
	// Return if the current context's author is the previous context's author.
	currentUser = null
	Template.room.isRepeatUser = function isRepeatUser()
	{
		var equals = this.author === currentUser;
		currentUser = this.author;
		return equals
	};

	// Callback on `render`; removes class loading.
	Template.room.rendered = function onrender()
	{
		var $nodes = this.findAll('.item');
		
		Meteor.defer( function()
			{
				Array.prototype.forEach.call( $nodes, function( $node )
					{
						$node.classList.remove( 'loading' );
					}
				);
			}
		);
		
		if ( Session.equals( 'notify', true ) )
			document.querySelector( '#notify' ).classList.add( 'active' );
	}

	// Callback on startup; sort-of `document.ready`.
	Meteor.startup( function ()
		{
			Messages.find().observe( {
				'added' : function added( message )
				{
					var name = Session.get( 'name' );
			
					if ( !time || !name || !Session.get( 'notify' ) )
						return
			
					if ( name !== message.author && message.timestamp > time )
					{
						console.log( 'added', message )
			
						options = {
							  'title' : 'message'
							, 'body' : message.text
							, 'icon' : ''
						};
			
						g = webkitNotifications.createNotification( './favicon.ico', options.title, options.body );
						g.show();
					}
				}
			} );
			Meteor.subscribe( 'rooms' );
			
			// Run a function and rerun it whenever its dependencies change.
			Meteor.autorun( function callback( handle )
				{
					if ( Session.get( 'room' ) )
					{
						Meteor.subscribe( 'messages'
							, { 'room' : Session.get( 'room' ) }
							, { 'sort' : { 'timestamp' : -1 } }
						);
					}
				}
			);
			
			// Route `/`: Set document-title to `Chat` and unset `room`.
			page( '/', function( ctx, next )
				{
					// Set `title` of `document` to 'Chat'.
					document.title = 'Chat';

					// Set Session's `room` to the rooms `undefined`.
					Session.set( 'room', undefined );
				}
			);

			// Route `/:room`.
			page( '/:room', function( ctx, next )
				{
					// Get room from parameters.
					room = ctx.params.room;

					Meteor.subscribe( 'rooms', function()
						{
							// Check if the room exists in `rooms`.
							var exists = _rooms.read( room );

							// if it doesn't...
							if ( !exists )
							{
								// ...create a new room with `room` as its name.
								_rooms.create( room );

								// Redirect to it.
								return page( '/' + room );
							}

							// Set `title` of `document` to 'Chat > :room'.
							document.title = 'Chat > ' + exists.name;

							// Set Session's `room` to the rooms `_id`.
							Session.set( 'room', exists._id );
						}
					);
				}
			);

			// Start routing.
			page.start( {} );

			// Store permission state in `notify`.
			Session.set( 'notify', webkitNotifications.checkPermission() === 0 );
		}
	);
}
