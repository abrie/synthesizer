#import <Foundation/Foundation.h>
#import "feelers/Feelers.h"
#import "MIDI/MIDI.h"
#import "BackendSync.h"

@interface Backend : NSObject <RealtimeProtocol, NoteEventDelegate> {
@private
    Feelers *feelers;
    MIDI *midi;
    BackendSync *sync;
}

- (id)initWithMidi:(MIDI *)_midi sync:(BackendSync *)q;

@end
