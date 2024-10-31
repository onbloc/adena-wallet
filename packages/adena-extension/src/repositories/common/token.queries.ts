export const makeAllRealmsQuery = (): string => `
{
  transactions(filter: {
    success: true
    message: {
      type_url: add_package
    }
  }) {
    messages {
        value {
          ... on MsgAddPackage {
            creator
            package {
              path
              name
              files {
                name
                body
              }
            }
          }
        }
    }
  }
}
`;

export const makeGRC721TransferEventsQuery = (packagePath: string, address: string): string => `
{
  transactions(
    filter: {
      success: true
      events: {
        type: "Transfer"
        pkg_path: "${packagePath}"
        attrs: [{
          key: "from"
          value: "${address}"
        }, {
          key:"to"
          value: "${address}"
        }]
      }
      messages: [
        {
          type_url: exec
        }
      ]
    }
    ascending: false
    after: null
  ) {
    pageInfo {
      last
      hasNext
    }
    edges {
      cursor
      transaction {
        hash
        index
        success
        block_height
        response {
          events {
            ...on GnoEvent {
              type
              pkg_path
              func
              attrs {
                key
                value
              }
            }
          }
        }
      }
    }
  }
}
`;
