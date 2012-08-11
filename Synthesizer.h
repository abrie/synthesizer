#import <Foundation/Foundation.h>
#import "feelers/Feelers.h"
#import "MIDI/MIDI.h"
#import "HTTP.h"

@interface Backend : NSObject <RealtimeProtocol, NoteEventDelegate, HTTPProtocol> {
@private
    Feelers *feelers;
    MIDI *midi;
    BackendHTTPServer *http;
    dispatch_queue_t queue;
    BOOL midiStarted;
}

- (id)initWithMidi:(MIDI *)_midi withHTTP:(BackendHTTPServer *)_http withQueue:(dispatch_queue_t)_queue;

@end
