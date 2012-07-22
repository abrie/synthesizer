#import <Foundation/Foundation.h>
#import "feelers/feelers.h"
#import "MIDI/MIDI.h"

@interface Backend : NSObject <RealtimeProtocol> {
@private
    Feelers *feelers;
}

@end
