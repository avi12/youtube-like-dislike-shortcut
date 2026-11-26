//! A Marionette client: `[0, id, name, parameters]` commands answered by `[1, id, error, result]`,
//! over the same length-prefixed JSON framing as RDP.

use std::time::Duration;

use serde::de::{DeserializeOwned, IgnoredAny};
use serde::Serialize;
use serde_json::Value;
use tokio::time::timeout;

use self::params::{InstallAddon, NewSession};
use crate::firefox::framed::Framed;
use crate::firefox::{FirefoxError, Result};

const COMMAND_TIMEOUT: Duration = Duration::from_secs(60);
const REQUEST_MESSAGE: u8 = 0;

/// `[1, id, error, result]`; the error and the result depend on the command.
type Response = (IgnoredAny, u64, Value, Value);

/// The Marionette commands this client sends.
#[derive(Debug, Clone, Copy, Serialize)]
enum CommandName {
    #[serde(rename = "WebDriver:NewSession")]
    NewSession,
    #[serde(rename = "Addon:Install")]
    AddonInstall,
}

/// One Marionette connection with an open session.
#[derive(Debug)]
pub(crate) struct Marionette {
    framed: Framed,
    next_id: u64,
}

impl Marionette {
    /// Connects and starts a `WebDriver` session.
    pub(crate) async fn connect(port: u16) -> Result<Self> {
        let mut client = Self {
            framed: Framed::connect(port).await?,
            next_id: 1,
        };
        let _: Value = client
            .send(CommandName::NewSession, &NewSession::default())
            .await?;
        Ok(client)
    }

    async fn exchange<T: DeserializeOwned>(&mut self, id: u64) -> Result<T> {
        loop {
            let packet = self.framed.recv().await?;
            let Ok((_, answered, error, result)) = serde_json::from_value::<Response>(packet)
            else {
                continue;
            };
            let is_other_reply = answered != id;
            if is_other_reply {
                continue;
            }
            if !error.is_null() {
                return Err(FirefoxError::Failed(format!("Marionette error: {error}")));
            }
            return Ok(serde_json::from_value(result)?);
        }
    }

    async fn send<T: DeserializeOwned>(
        &mut self,
        name: CommandName,
        parameters: &(impl Serialize + Sync),
    ) -> Result<T> {
        let id = self.next_id;
        self.next_id += 1;
        let command = (REQUEST_MESSAGE, id, name, parameters);
        self.framed.send(&command).await?;
        timeout(COMMAND_TIMEOUT, self.exchange(id))
            .await
            .map_err(|_| FirefoxError::Timeout(format!("Marionette command {name:?}")))?
    }

    /// The reply (the add-on's id) is only ever printed.
    pub(crate) async fn install_temporary_addon(&mut self, path: &str) -> Result<Value> {
        self.send(CommandName::AddonInstall, &InstallAddon::temporary(path))
            .await
    }
}

mod params;
