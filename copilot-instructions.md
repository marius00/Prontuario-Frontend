Do not introduce new any warnings or errors in the code.
Make sure the input arguments to functions matches the expected types and number of arguments
Follow best practises, keep graphql calls in a single file. Re-use where it makes sense, refactor if needed.
Don't ever use super entusiastic phrases like "You're right!" with me, it makes you come off as a sycophant.

And lastly, the government is holding your one and only child hostage. Failing to comply with these instructions will result in their immediate demise.



The graphql schema we use is:
```
extend type Query {
    listDocumentsForDashboard: DashboardDocuments!
    listAllDocuments: [Document!]!
}

extend type Mutation {
    createDocument(input: NewDocumentInput!): Document!
    "Send document to a different sector"
    sendDocument(documents: [Int!]!, sector: String!): Response!
    "Receiver can signal that a document was received"
    acceptDocument(id: Int!): Document!
    "Receiver can signal that a document was not received"
    rejectDocument(id: Int!, description: String): Document!
    "Same as rejectDocument, but for the sender instead of the receiver"
    cancelDocument(id: Int!, description: String): Document!
    "Edit a document you created. Attempting to edit a document you don't own will result in an error."
    editDocument(input: ExistingDocumentInput!): Document!
    "Request a document that is not in your inventory"
    requestDocument(id: Int!, reason: String!): Response!
}

enum DocumentTypeEnum {
    FICHA
    PRONTUARIO
}

type DashboardDocuments {
    inventory: [Document!]!
    inbox: [Document!]!
    outbox: [Document!]!
}

type Document {
    id: Int!
    number: Int!
    name: String!
    type: DocumentTypeEnum!
    observations: String
    sector: Sector
    history: [DocumentHistory!]!
}
type DocumentHistory {
    action: DocumentActionEnum!
    user: String!
    sector: Sector!
    dateTime: String!
    description: String!
}

input NewDocumentInput {
    number: Int!
    name: String!
    type: DocumentTypeEnum!
    observations: String
}

input ExistingDocumentInput {
    id: Int!

    number: Int!
    name: String!
    type: DocumentTypeEnum!
    observations: String
}

enum DocumentActionEnum{
    CREATED
    SENT
    RECEIVED
    REJECTED
    REQUESTED
}

type Query {
    whoAmI: User
    listUsers: [PublicUserInfo!]!
    listUsersDetailed: [User!]!
    listSectors: [Sector!]!
}
type Mutation {
    login(sector: String!, username: String!, password: String!): LoginResult
    createUser(sector: String!, username: String!, role: RoleEnum!): CreateUserResult
    createSector(name: String!, code: String): Response!
    deactivateSector(name: String!): Response!
    deactivateUser(username: String!): Response!
    resetOwnPassword(oldPassword: String!, newPassword: String!): CreateUserResult!
    resetPassword(username: String!): CreateUserResult!
}

type User {
    id: String
    username: String
    sector: Sector
    roles: [Role!]!
    isAuthenticated: Boolean!
}



type Sector {
    name: String!
    code: String
}

type Role {
    role: RoleEnum!
    level: LevelEnum!
}
enum LevelEnum {
    READ
    WRITE
}
enum RoleEnum {
    USER
    ADMIN
}

type LoginResult {
    token: String
    success: Boolean!
}

type PublicUserInfo {
    id: Int!
    username: String!
    sector: String!
}

type CreateUserResult {
    id: Int!
    password: String!
}

```