#import <Foundation/Foundation.h>
#import "feelers/feelers.h"
#import "MIDI/MIDI.h"
#import "MessageSync.h"

@interface Backend : NSObject <RealtimeProtocol, NoteEventDelegate, MessageSyncProtocol> {
@private
    Feelers *feelers;
    MIDI *midi;
}

@property (atomic, strong) MessageSync *messageSync;

- (id)initWithMidi:(MIDI *)_midi sync:(MessageSync *)sync;

@end
