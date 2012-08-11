#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@interface ConfigurationEntity : NSManagedObject

@property (nonatomic, retain) NSString * midiSource;
@property (nonatomic, retain) NSString * midiDestination;
@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSString * documentRoot;

@end
