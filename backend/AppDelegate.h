#import <Cocoa/Cocoa.h>
#import "MIDI/MIDI.h"
#import "HTTP/http.h"
#import "Backend.h"
#import "MessageSync.h"

@interface AppDelegate : NSObject <NSApplicationDelegate> {
@private
    MIDI *midi;
    HTTP *http;
    Backend *backend;
    MessageSync *messageSync;
}

@property (assign) IBOutlet NSWindow *window;
@property (weak) IBOutlet NSButton *testMidiButton;
@property (weak) IBOutlet NSComboBox *destinationComboBox;
@property (weak) IBOutlet NSComboBox *sourceComboBox;

@property (readonly, strong, nonatomic) NSPersistentStoreCoordinator *persistentStoreCoordinator;
@property (readonly, strong, nonatomic) NSManagedObjectModel *managedObjectModel;
@property (readonly, strong, nonatomic) NSManagedObjectContext *managedObjectContext;

- (IBAction)saveAction:(id)sender;
- (IBAction)testMidiAction:(id)sender;
- (IBAction)destinationSelectAction:(id)sender;
- (IBAction)sourceSelectAction:(id)sender;

@end
