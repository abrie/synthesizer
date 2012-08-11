#import "Synthesizer.h"

@implementation Backend

- (id)initWithMidi:(MIDI *)_midi withHTTP:(BackendHTTPServer *)_http withQueue:(dispatch_queue_t)_queue
{
    self = [super init];
    if (self) {
        queue = _queue;
        
        feelers = [[Feelers alloc] init];
        [feelers setNoteEventDelegate:self];
        
        midi = _midi;
        [midi setRealtimeDelegate:self];
        
        http = _http;
        [http setMessageDelegate:self];
        
        midiStarted = NO;
    }
    
    return self;
}

- (void)messageFromClient:(NSDictionary *)message
{
    dispatch_async(queue, ^{
        [self processMessage:message];
        
    });
}

- (void)processMessage:(NSDictionary *)message
{
    NSArray *instruments = message[@"toFeelers"][@"instruments"];
    [feelers setNodeStatesWithInstruments:instruments];
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
    midiStarted = YES;
    NSLog(@"Midi start.");
}

-(void)midiClock
{
    if (!midiStarted) {
        return;
    }
    
    dispatch_async(queue, ^{
        [feelers sample];
        [feelers advance];
    });
}

-(void)midiTick
{
    
}

-(void)midiContinue
{
    midiStarted = YES;
    NSLog(@"Midi continue.");
}

-(void)midiStop
{
    midiStarted = NO;
    NSLog(@"Midi stop.");
}

@end
