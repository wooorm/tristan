// == Sound ====================================================================

// -- Constructor --------------------------------------------------------------
(
	function wrapper( exports, document )
	{
		if ( !window.webkitAudioContext )
			return;
		
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

		// -- Prototype --------------------------------------------------------
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
		
		exports.Sound = Sound;
	}
)( window, document )
