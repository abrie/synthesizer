#import "Backend.h"

@implementation Backend

- (id)initWithMidi:(MIDI *)_midi sync:(BackendSync *)q
{
    self = [super init];
    if (self) {
        feelers = [[Feelers alloc] init];
        [feelers setNoteEventDelegate:self];
        
        midi = _midi;
        [midi setRealtimeDelegate:self];
        
        sync = q;
    }
    
    return self;
}

- (void)processMessage:(NSDictionary *)message
{
    [feelers setNodeStates:message];
}

- (void)offChannel:(unsigned int)channel note:(unsigned int)note velocity:(unsigned int)velocity
{
    [midi sendOffToChannel:channel number:note velocity:velocity];
}

- (void)onChannel:(unsigned int)channel note:(unsigned int)note velocity:(unsigned int)velocity
{
    [midi sendOnToChannel:channel number:note velocity:velocity];
}

-(void)midiStart
{
    
}

-(void)midiClock
{
    NSDictionary *message = [sync readMessage]; // troubling assumption here; of there only being one message available...
    if( message != nil )
    {
        NSLog(@"message recved");
    }
    [feelers advance];
    [feelers sample];
}

-(void)midiTick
{
    
}

-(void)midiContinue
{
    
}

-(void)midiStop
{
    
}

@end
