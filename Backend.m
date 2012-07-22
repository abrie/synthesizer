#import "Backend.h"

@implementation Backend

- (id)init
{
    self = [super init];
    if (self) {
        feelers = [[Feelers alloc] init];
    }
    
    return self;
}

-(void)midiContinue
{
    
}

-(void)midiClock
{
    [feelers advance];
}

-(void)midiStart
{

}

-(void)midiStop
{
    
}

@end
