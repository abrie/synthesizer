#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@interface MidiEntity : NSManagedObject

@property (nonatomic, retain) NSString * input;
@property (nonatomic, retain) NSString * output;
@property (nonatomic, retain) NSString * config;
@property (nonatomic, retain) NSString * documentRoot;

@end
