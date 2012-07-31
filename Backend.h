#import <Foundation/Foundation.h>
#import "feelers/feelers.h"
#import "MIDI/MIDI.h"

@interface Backend : NSObject <RealtimeProtocol, NoteEventDelegate> {
@private
    Feelers *feelers;
    MIDI *midi;
}

- (id)initWithMidi:(MIDI *)_midi;

@end
