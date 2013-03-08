// Store Mongo's `room` collection.
// Store Mongo's `messages` collection.
var Rooms = new Meteor.Collection( 'rooms' )
  , Messages = new Meteor.Collection( 'messages' )
  ;

// == Set-up ===================================================================
Meteor.publish( 'rooms', function anonymous()
	{
		return Rooms.find( {} );
	}
);
	
Meteor.publish( 'messages', function anonymous( selector, options )
	{
		return Messages.find( selector, options );
	}
);

// == Methods ==================================================================
// -- CRUD ---------------------------------------------------------------------
Meteor.methods( {
	  'rooms:create' : function create( room, author )
	{
		Rooms.insert( { 'name': room, 'author' : author } );
	}
	, 'rooms:delete' : function _delete( id )
	{
		Messages.remove( { 'room': id } );
		Rooms.remove( { '_id': id } );
	}
	, 'messages:create' : function create( room, author, value )
	{
		Messages.insert( {
			  'room' :      room
			, 'author' :    author
			, 'text' :      value
			, 'timestamp' : +new Date()
		} );
	}
	, 'messages:delete' : function _delete( _id )
	{
		Messages.remove( { '_id' : _id } );
	}
	, 'messages:deleteByAuthor' : function _delete( author, room )
	{
		Messages.remove( { 'author' : author, 'room' : room } );
	}
} );

// -- Utilities ----------------------------------------------------------------
Meteor.methods( {
	  'server:time' : function tme()
	{
		return +new Date();
	}
} );
