#import "Synthesizer.h"

@implementation Backend

- (id)initWithMidi:(MIDI *)_midi withHTTP:(BackendHTTPServer *)_http withQueue:(dispatch_queue_t)_queue
{
    self = [super init];
    if (self) {
        queue = _queue;
        connections = [[NSMutableArray alloc] init];
        
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

- (void)clientConnected:(BackendWebSocketConnection *)connection
{
    NSLog(@"clientConnected");
    [connections addObject:connection];
}

- (void)clientDisconnected:(BackendWebSocketConnection *)connection
{
    NSLog(@"clientDisconnected");
    [connections removeObject:connection];
}

- (void)processMessage:(NSDictionary *)message
{
    NSArray *instruments = message[@"toFeelers"][@"instruments"];
    [feelers setNodeStatesWithInstruments:instruments];
}

- (void)sendMessage:(NSString *)message
{
    [connections enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
        [obj sendMessage:message];
    }];
}

- (void)offChannel:(unsigned int)channel note:(unsigned int)note velocity:(unsigned int)velocity
{
    [midi sendOffToChannel:channel number:note velocity:velocity];
}

- (void)onChannel:(NoteEvent *)event;
{
    [midi sendOnToChannel:[event channel] number:[event noteNumber] velocity:[event onVelocity]];
    [self sendMessage:[NSString stringWithFormat:@"{\"type\":\"emitter\",\"name\":\"%@\"}", [event emitter]]];
}

-(void)midiStart
{
    midiStarted = YES;
    midiClocks = 0;
    NSLog(@"Midi start.");
    [self sendMessage:@"{\"type\":\"midi_start\"}"];
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
    
      midiClocks++;
    if (midiClocks == 24) {
        [self sendMessage:@"{\"type\":\"midi\",\"message\":\"24\"}"];
        midiClocks = 0;
    }
}

-(void)midiTick
{
    
}

-(void)midiContinue
{
    midiStarted = YES;
    [self sendMessage:@"{\"type\":\"midi\",\"message\":\"continue\"}"];
    NSLog(@"Midi continue.");
}

-(void)midiStop
{
    midiStarted = NO;
    [self sendMessage:@"{\"type\":\"midi\",\"message\":\"stop\"}"];
    NSLog(@"Midi stop.");
}

@end
