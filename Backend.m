#import "Backend.h"

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
    
}

-(void)midiClock
{
    dispatch_async(queue, ^{
        [feelers advance];
        [feelers sample];
    });
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
