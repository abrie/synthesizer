#import <Cocoa/Cocoa.h>
#import "MIDI.h"
#import "HTTP/http.h"
#import "Backend.h"

@interface AppDelegate : NSObject <NSApplicationDelegate> {
@private
    MIDI *midi;
    HTTP *http;
    Backend *backend;
    BackendSync *backendSync;
}

@property (assign) IBOutlet NSWindow *window;
@property (weak) IBOutlet NSComboBox *destinationComboBox;
@property (weak) IBOutlet NSComboBox *sourceComboBox;
@property (weak) IBOutlet NSButton *internalClockOutlet;
@property (weak) IBOutlet NSSlider *tempoOutlet;
@property (weak) IBOutlet NSButton *frontendOutlet;
@property (weak) IBOutlet NSTextField *intervalValueOutput;

@property (readonly, strong, nonatomic) NSPersistentStoreCoordinator *persistentStoreCoordinator;
@property (readonly, strong, nonatomic) NSManagedObjectModel *managedObjectModel;
@property (readonly, strong, nonatomic) NSManagedObjectContext *managedObjectContext;

- (IBAction)saveAction:(id)sender;
- (IBAction)destinationSelectAction:(id)sender;
- (IBAction)sourceSelectAction:(id)sender;
- (IBAction)internalClockAction:(id)sender;
- (IBAction)tempoAction:(id)sender;
- (IBAction)frontendAction:(id)sender;

@end
