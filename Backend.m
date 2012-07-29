#import "Backend.h"

@implementation Backend
@synthesize messageSync;

- (id)initWithMidi:(MIDI *)_midi sync:(MessageSync *)sync
{
    self = [super init];
    if (self) {
        feelers = [[Feelers alloc] init];
        [feelers setNoteEventDelegate:self];
        
        midi = _midi;
        [midi setRealtimeDelegate:self];
        
        messageSync = sync;
        [messageSync setMessageDelegate:self];
    }
    
    return self;
}

- (void)processMessage:(NSDictionary *)message
{
}

- (void)setStandard
{
    NSDictionary *standard =
    @{
    @"root" : @{ @"type":@"branch", @"name" : @"root", @"subNodes" : @[@"emitter"] },
    @"emitter" : @{
        @"type":@"emitter",
        @"name" : @"emitter",
        @"note" : @[@60],
        @"onVelocity" : @[@64],
        @"duration" : @[@1],
        @"offVelocity" : @[@54],
        @"channel" : @[@0]}
    };
    
    [feelers setNodeStates:standard];
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
    [messageSync processMessages];
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
