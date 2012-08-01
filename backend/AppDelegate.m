#import "AppDelegate.h"

@implementation AppDelegate
@synthesize destinationComboBox = _destinationComboBox;
@synthesize sourceComboBox = _sourceComboBox;
@synthesize internalClockOutlet = _internalClockOutlet;
@synthesize tempoOutlet = _tempoOutlet;
@synthesize frontendOutlet = _frontendOutlet;
@synthesize intervalValueOutput = _intervalValueOutput;
@synthesize documentRootOutlet = _documentRootOutlet;

@synthesize persistentStoreCoordinator = _persistentStoreCoordinator;
@synthesize managedObjectModel = _managedObjectModel;
@synthesize managedObjectContext = _managedObjectContext;

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification
{
    midi = [[MIDI alloc] initWithName:@"feelers synthesizer"];
    backendSync = [[BackendSync alloc] initWithQueue:dispatch_get_current_queue()];
    
    backend = [[Backend alloc] initWithMidi:midi sync:backendSync];
    http = [[HTTP alloc] initWithSync:backendSync];
    
    [_destinationComboBox addItemsWithObjectValues:[midi destinations]];
    [_destinationComboBox setStringValue:@"select destination..."];
    [_sourceComboBox addItemsWithObjectValues:[midi sources]];
    [_sourceComboBox setStringValue:@"select source..."];
    
    [self loadSettings];
}

- (NSString *)defaultWebPath
{
    return [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"HTML"];
}

- (void)loadSettings
{
    ConfigurationEntity *entity = [self getDefaultMidiEntity];
    
    NSLog(@"Settings found :%@/%@", [entity input], [entity output]);
    [midi connectDestinationByName:[entity output]];
    [midi connectSourceByName:[entity input]];
    [_sourceComboBox selectItemWithObjectValue:[entity input]];
    [_destinationComboBox selectItemWithObjectValue:[entity output]];
    [_documentRootOutlet setStringValue:[entity documentRoot]];
    [http setDocumentRoot:[entity documentRoot]];
}

- (ConfigurationEntity *)getDefaultMidiEntity
{
   // Retrieve the entity from the local store -- much like a table in a database
    NSEntityDescription *entity = [NSEntityDescription entityForName:@"ConfigurationEntity"
                                              inManagedObjectContext:[self managedObjectContext]];
    
    NSFetchRequest *request = [[NSFetchRequest alloc] init];
    [request setEntity:entity];
    
    NSPredicate *predicate = [NSPredicate predicateWithFormat:@"config == %@", @"default"];
    [request setPredicate:predicate];
    
    NSSortDescriptor *sortDescriptor = [[NSSortDescriptor alloc] initWithKey:@"config" ascending:YES];
    NSArray *sortDescriptors = [[NSArray alloc] initWithObjects:sortDescriptor, nil];
    [request setSortDescriptors:sortDescriptors];
    
    NSError *error;
    
    NSArray *matches = [[self managedObjectContext] executeFetchRequest:request error:&error];
    
    if ([matches count] > 0)
    {
        return matches[0];
    }
    else
    {
        ConfigurationEntity *m = [NSEntityDescription insertNewObjectForEntityForName:@"ConfigurationEntity"
                                                    inManagedObjectContext:[self managedObjectContext]];
        NSURL *storeURL = [self applicationFilesDirectory];
        
        id store = [_persistentStoreCoordinator persistentStoreForURL:storeURL];
        
        [_managedObjectContext assignObject:m
                          toPersistentStore:store];
        
        return m;
    }
}

- (void)doStore
{
    ConfigurationEntity *entity = [self getDefaultMidiEntity];
   
    entity.output = [self getSelectedOutputName];
    entity.input = [self getSelectedInputName];
    entity.config = @"default";
    entity.documentRoot = [self getDocumentRoot];
    
    NSLog(@"settings changed: %@/%@", entity.output, entity.input);
    NSLog(@"document root: %@", entity.documentRoot);
}

- (NSString *)getDocumentRoot
{
    return [_documentRootOutlet stringValue];
}

- (NSString *)getSelectedInputName
{
    NSUInteger index = [_sourceComboBox indexOfSelectedItem];
    if (index < [_sourceComboBox numberOfItems])
    {
        return [midi sources][index];
    }
    else
    {
        return @"";
    }
}

- (NSString *)getSelectedOutputName
{
    NSUInteger index = [_destinationComboBox indexOfSelectedItem];
    if (index < [_destinationComboBox numberOfItems])
    {
        return [midi destinations][index];
    }
    else
    {
        return @"";
    }
}

- (void)destinationSelectAction:(id)sender
{
    NSInteger index = [_destinationComboBox indexOfSelectedItem];
    [midi connectDestinationByIndex:index];
    [self doStore];
}

- (void)sourceSelectAction:(id)sender
{
    NSInteger index = [_sourceComboBox indexOfSelectedItem];
    [midi connectSourceByIndex:index];
    [self doStore];
}

- (NSTimeInterval)interval
{
    return [[self tempoOutlet] floatValue];
}

- (IBAction)internalClockAction:(id)sender
{
    if ([_internalClockOutlet state] == NSOnState)
    {
        [midi runInternalClock:[self interval]];
    }
    else
    {
        [midi stopInternalClock];
    }
}

- (IBAction)tempoAction:(id)sender {
    [midi adjustInternalClock:[self interval]];
    [_intervalValueOutput setStringValue:[NSString stringWithFormat:@"%@",[NSNumber numberWithDouble:[self interval]]]];
}

- (IBAction)frontendAction:(id)sender {
   [[NSWorkspace sharedWorkspace] openURL: [NSURL URLWithString:@"http://yeux.local.:12345/frontend.html"]];
}

- (IBAction)documentRootAction:(id)sender {
    [http setDocumentRoot:[_documentRootOutlet stringValue]];
    [self doStore];
}

- (IBAction)defaultDocumentRootAction:(id)sender {
    [_documentRootOutlet setStringValue:[self defaultWebPath]];
    [http setDocumentRoot:[_documentRootOutlet stringValue]];
    [self doStore];
}

// Returns the directory the application uses to store the Core Data store file. This code uses a directory named "abrie.backend" in the user's Application Support directory.
- (NSURL *)applicationFilesDirectory
{
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSURL *appSupportURL = [[fileManager URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask] lastObject];
    return [appSupportURL URLByAppendingPathComponent:@"abrie.backend"];
}

// Creates if necessary and returns the managed object model for the application.
- (NSManagedObjectModel *)managedObjectModel
{
    if (_managedObjectModel) {
        return _managedObjectModel;
    }
	
    NSURL *modelURL = [[NSBundle mainBundle] URLForResource:@"backend" withExtension:@"momd"];
    _managedObjectModel = [[NSManagedObjectModel alloc] initWithContentsOfURL:modelURL];
    return _managedObjectModel;
}

// Returns the persistent store coordinator for the application. This implementation creates and return a coordinator, having added the store for the application to it. (The directory for the store is created, if necessary.)
- (NSPersistentStoreCoordinator *)persistentStoreCoordinator
{
    if (_persistentStoreCoordinator) {
        return _persistentStoreCoordinator;
    }
    
    NSManagedObjectModel *mom = [self managedObjectModel];
    if (!mom) {
        NSLog(@"%@:%@ No model to generate a store from", [self class], NSStringFromSelector(_cmd));
        return nil;
    }
    
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSURL *applicationFilesDirectory = [self applicationFilesDirectory];
    NSError *error = nil;
    
    NSDictionary *properties = [applicationFilesDirectory resourceValuesForKeys:@[NSURLIsDirectoryKey] error:&error];
    
    if (!properties) {
        BOOL ok = NO;
        if ([error code] == NSFileReadNoSuchFileError) {
            ok = [fileManager createDirectoryAtPath:[applicationFilesDirectory path] withIntermediateDirectories:YES attributes:nil error:&error];
        }
        if (!ok) {
            [[NSApplication sharedApplication] presentError:error];
            return nil;
        }
    } else {
        if (![[properties objectForKey:NSURLIsDirectoryKey] boolValue]) {
            // Customize and localize this error.
            NSString *failureDescription = [NSString stringWithFormat:@"Expected a folder to store application data, found a file (%@).", [applicationFilesDirectory path]];
            
            NSMutableDictionary *dict = [NSMutableDictionary dictionary];
            [dict setValue:failureDescription forKey:NSLocalizedDescriptionKey];
            error = [NSError errorWithDomain:@"YOUR_ERROR_DOMAIN" code:101 userInfo:dict];
            
            [[NSApplication sharedApplication] presentError:error];
            return nil;
        }
    }
    
    NSURL *url = [applicationFilesDirectory URLByAppendingPathComponent:@"backend.storedata"];
    NSPersistentStoreCoordinator *coordinator = [[NSPersistentStoreCoordinator alloc] initWithManagedObjectModel:mom];
    if (![coordinator addPersistentStoreWithType:NSXMLStoreType configuration:nil URL:url options:nil error:&error]) {
        [[NSApplication sharedApplication] presentError:error];
        return nil;
    }
    _persistentStoreCoordinator = coordinator;
    
    return _persistentStoreCoordinator;
}

// Returns the managed object context for the application (which is already bound to the persistent store coordinator for the application.) 
- (NSManagedObjectContext *)managedObjectContext
{
    if (_managedObjectContext) {
        return _managedObjectContext;
    }
    
    NSPersistentStoreCoordinator *coordinator = [self persistentStoreCoordinator];
    if (!coordinator) {
        NSMutableDictionary *dict = [NSMutableDictionary dictionary];
        [dict setValue:@"Failed to initialize the store" forKey:NSLocalizedDescriptionKey];
        [dict setValue:@"There was an error building up the data file." forKey:NSLocalizedFailureReasonErrorKey];
        NSError *error = [NSError errorWithDomain:@"YOUR_ERROR_DOMAIN" code:9999 userInfo:dict];
        [[NSApplication sharedApplication] presentError:error];
        return nil;
    }
    _managedObjectContext = [[NSManagedObjectContext alloc] init];
    [_managedObjectContext setPersistentStoreCoordinator:coordinator];

    return _managedObjectContext;
}

// Returns the NSUndoManager for the application. In this case, the manager returned is that of the managed object context for the application.
- (NSUndoManager *)windowWillReturnUndoManager:(NSWindow *)window
{
    return [[self managedObjectContext] undoManager];
}

// Performs the save action for the application, which is to send the save: message to the application's managed object context. Any encountered errors are presented to the user.
- (IBAction)saveAction:(id)sender
{
    NSError *error = nil;
    
    if (![[self managedObjectContext] commitEditing]) {
        NSLog(@"%@:%@ unable to commit editing before saving", [self class], NSStringFromSelector(_cmd));
    }
    
    if (![[self managedObjectContext] save:&error]) {
        [[NSApplication sharedApplication] presentError:error];
    }
}

- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication *)sender
{
    // Save changes in the application's managed object context before the application terminates.
    
    if (!_managedObjectContext) {
        return NSTerminateNow;
    }
    
    if (![[self managedObjectContext] commitEditing]) {
        NSLog(@"%@:%@ unable to commit editing to terminate", [self class], NSStringFromSelector(_cmd));
        return NSTerminateCancel;
    }
    
    if (![[self managedObjectContext] hasChanges]) {
        return NSTerminateNow;
    }
    
    NSError *error = nil;
    if (![[self managedObjectContext] save:&error]) {

        // Customize this code block to include application-specific recovery steps.              
        BOOL result = [sender presentError:error];
        if (result) {
            return NSTerminateCancel;
        }

        NSString *question = NSLocalizedString(@"Could not save changes while quitting. Quit anyway?", @"Quit without saves error question message");
        NSString *info = NSLocalizedString(@"Quitting now will lose any changes you have made since the last successful save", @"Quit without saves error question info");
        NSString *quitButton = NSLocalizedString(@"Quit anyway", @"Quit anyway button title");
        NSString *cancelButton = NSLocalizedString(@"Cancel", @"Cancel button title");
        NSAlert *alert = [[NSAlert alloc] init];
        [alert setMessageText:question];
        [alert setInformativeText:info];
        [alert addButtonWithTitle:quitButton];
        [alert addButtonWithTitle:cancelButton];

        NSInteger answer = [alert runModal];
        
        if (answer == NSAlertAlternateReturn) {
            return NSTerminateCancel;
        }
    }

    return NSTerminateNow;
}

@end
